import { Job, Worker } from "bullmq";
import { convertModuleToWAV } from "../module-converter";
import { convertAudioToFormat } from "../audio-file-converter";
import {
  AudioFileConversionStatus,
  SourceFormat,
  StorageFile,
  config,
} from "@wavtopia/core-storage";
import { uploadFile, getObject } from "../storage";
import {
  createQueue,
  prisma,
  setupQueueMonitoring,
  standardJobOptions,
} from "./common";

interface AudioFileConversionJob {
  trackId: string;
  type: "full" | "component";
  componentId?: string;
  format: "wav" | "flac";
}

// Create queue
export const audioFileConversionQueue = createQueue<AudioFileConversionJob>(
  "audio-file-conversion"
);

// Set up monitoring
setupQueueMonitoring(audioFileConversionQueue, "Audio file conversion");

// Utility function to download and buffer a file from storage
async function downloadFileToBuffer(fileUrl: string): Promise<Buffer> {
  const stream = await getObject(fileUrl);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// Utility function to upload an audio file
async function uploadAudioFile(
  buffer: Buffer,
  filename: string,
  directory: string,
  format: "wav" | "flac"
): Promise<string> {
  return uploadFile(
    {
      buffer,
      originalname: `${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}.${format}`,
      mimetype: `audio/${format}`,
    } as StorageFile,
    directory
  );
}

// Utility function to update audio file conversion status
async function updateAudioFileConversionStatus(
  type: "full" | "component",
  id: string,
  status: AudioFileConversionStatus,
  format: "wav" | "flac",
  audioFileUrl?: string
): Promise<void> {
  const conversionStatusProperty =
    format === "wav" ? "wavConversionStatus" : "flacConversionStatus";
  const createdAtProperty = format === "wav" ? "wavCreatedAt" : "flacCreatedAt";
  const lastRequestedAtProperty =
    format === "wav" ? "wavLastRequestedAt" : "flacLastRequestedAt";

  const now = new Date();

  if (type === "full") {
    const audioFileUrlProperty =
      format === "wav" ? "fullTrackWavUrl" : "fullTrackFlacUrl";

    await prisma.track.update({
      where: { id },
      data: {
        [conversionStatusProperty]: status,
        ...(audioFileUrl && { [audioFileUrlProperty]: audioFileUrl }),
        ...(status === AudioFileConversionStatus.COMPLETED && {
          [createdAtProperty]: now,
          // Initialize last requested at to now for efficiency, so we don't
          // have to check the creation date of the file as well when cleaning up
          // old files.
          [lastRequestedAtProperty]: now,
        }),
      },
    });
  } else {
    const audioFileUrlProperty = format === "wav" ? "wavUrl" : "flacUrl";

    await prisma.component.update({
      where: { id },
      data: {
        [conversionStatusProperty]: status,
        ...(audioFileUrl && { [audioFileUrlProperty]: audioFileUrl }),
        ...(status === AudioFileConversionStatus.COMPLETED && {
          [createdAtProperty]: now,
          [lastRequestedAtProperty]: now, // As above
        }),
      },
    });
  }
}

async function audioFileConversionProcessor(job: Job<AudioFileConversionJob>) {
  const { trackId, type, componentId, format } = job.data;

  console.log(
    `Processing ${format} conversion job ${job.id} for ${
      componentId ? `component ${componentId}` : `track ${trackId}`
    }`
  );

  try {
    // Get the track
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { components: true },
    });

    if (!track) {
      throw new Error(`Track not found: ${trackId}`);
    }

    if (type === "full") {
      const sourceUrlProperty =
        format === "wav" ? "fullTrackFlacUrl" : "fullTrackWavUrl";

      if (
        !(
          track[sourceUrlProperty] ||
          ((track.originalFormat === SourceFormat.XM ||
            track.originalFormat === SourceFormat.IT ||
            track.originalFormat === SourceFormat.MOD) &&
            track.originalUrl)
        )
      ) {
        throw new Error(
          `Track ${trackId} has no FLAC or original source ${track.originalFormat} file URL`
        );
      }

      // Update conversion status to IN_PROGRESS for full track conversion
      await updateAudioFileConversionStatus(
        "full",
        trackId,
        AudioFileConversionStatus.IN_PROGRESS,
        format
      );

      const audioBuffer = await convertToFormat(
        track,
        track.fullTrackFlacUrl,
        format
      );

      // Upload WAV file
      const audioFileUrl = await uploadAudioFile(
        audioBuffer,
        `${track.title}_full`,
        "tracks/",
        format
      );

      // Update track with WAV URL and status
      await updateAudioFileConversionStatus(
        "full",
        trackId,
        AudioFileConversionStatus.COMPLETED,
        format,
        audioFileUrl
      );
    } else if (type === "component" && componentId) {
      const component = track.components.find((c) => c.id === componentId);
      if (!component) {
        throw new Error(`Component ${componentId} not found`);
      }

      const sourceUrlProperty = format === "wav" ? "flacUrl" : "wavUrl";

      if (
        !(
          component[sourceUrlProperty] ||
          ((track.originalFormat === SourceFormat.XM ||
            track.originalFormat === SourceFormat.IT ||
            track.originalFormat === SourceFormat.MOD) &&
            track.originalUrl)
        )
      ) {
        const sourceFormat = format === "wav" ? "FLAC" : "WAV";
        throw new Error(
          `Component ${componentId} has no ${sourceFormat} or full track original source ${track.originalFormat} file URL`
        );
      }

      // Update conversion status to IN_PROGRESS for component conversion
      await updateAudioFileConversionStatus(
        "component",
        componentId,
        AudioFileConversionStatus.IN_PROGRESS,
        format
      );

      const componentIndex = track.components.findIndex(
        (c) => c.id === componentId
      );

      const audioBuffer = await convertToFormat(
        track,
        component[sourceUrlProperty],
        format,
        componentIndex
      );

      // Upload WAV file
      const wavUrl = await uploadAudioFile(
        audioBuffer,
        `${track.title}_${component.name}`,
        "components/",
        format
      );

      // Update component with WAV URL and status
      await updateAudioFileConversionStatus(
        "component",
        componentId,
        AudioFileConversionStatus.COMPLETED,
        format,
        wavUrl
      );
    }

    console.log(`WAV conversion completed for track ${trackId}`);
  } catch (error) {
    console.error(`Error processing WAV conversion job ${job.id}:`, error);

    if (job.data.type === "full") {
      await updateAudioFileConversionStatus(
        "full",
        job.data.trackId,
        AudioFileConversionStatus.FAILED,
        job.data.format
      );
    } else if (job.data.type === "component" && job.data.componentId) {
      await updateAudioFileConversionStatus(
        "component",
        job.data.componentId,
        AudioFileConversionStatus.FAILED,
        job.data.format
      );
    }

    throw error;
  }
}

// Process audio file conversion jobs
export const worker = new Worker<AudioFileConversionJob>(
  "audio-file-conversion",
  audioFileConversionProcessor,
  {
    connection: config.redis,
  }
);

// Cleanup function for graceful shutdown
export async function cleanup(): Promise<void> {
  await worker.close();
}

// Add audio file conversion job to queue
export const queueAudioFileConversion = async (
  trackId: string,
  type: "full" | "component",
  format: "wav" | "flac",
  componentId?: string
) => {
  const job = await audioFileConversionQueue.add(
    "convert-audio-file",
    {
      trackId,
      type,
      componentId,
      format,
    },
    standardJobOptions
  );

  return job.id;
};

// Utility function to convert to WAV from either FLAC or module source
async function convertToFormat(
  track: {
    originalUrl: string | null;
    originalFormat: string | null;
    fullTrackFlacUrl: string | null;
    fullTrackWavUrl: string | null;
  },
  sourceUrl: string | null,
  format: "flac" | "wav",
  componentIndex?: number
): Promise<Buffer> {
  const sourceFormat = format === "wav" ? "flac" : "wav";
  // Try source path first
  if (sourceUrl) {
    console.log(
      `${sourceFormat} file found, converting from ${sourceFormat} to ${format}`
    );
    const sourceBuffer = await downloadFileToBuffer(sourceUrl);
    return convertAudioToFormat(sourceBuffer, format);
  } else if (
    (track.originalFormat === SourceFormat.XM ||
      track.originalFormat === SourceFormat.IT ||
      track.originalFormat === SourceFormat.MOD) &&
    track.originalUrl
  ) {
    console.log(
      `No ${sourceFormat} file found, converting from ${track.originalFormat} to ${format}`
    );
    const sourceBuffer = await downloadFileToBuffer(track.originalUrl);

    const converted = await convertModuleToWAV(
      sourceBuffer,
      track.originalFormat
    );

    let wavBuffer: Buffer;
    if (typeof componentIndex === "number") {
      // TODO: We might want to retain all components, seeing as the user has
      // expressed an interest in this track.
      // An alternative could be to check for other queued jobs for this track
      // and merge them with the current job.
      const { components } = converted;
      if (!components[componentIndex]) {
        throw new Error(
          `Could not find matching WAV component at index ${componentIndex}`
        );
      }
      wavBuffer = components[componentIndex].buffer;
    } else {
      wavBuffer = converted.fullTrackWavBuffer;
    }

    return convertAudioToFormat(wavBuffer, format);
  }

  throw new Error("No valid source found for WAV conversion");
}
