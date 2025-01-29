import Queue, { Job } from "bull";
import { convertXMToWAV } from "../../services/wav-converter";
import { convertWAVToMP3 } from "../../services/mp3-converter";
import { convertFLACToWAV } from "../../services/flac-converter";
import { generateWaveformData } from "../../services/waveform";
import {
  StorageFile,
  WavConversionStatus,
  PrismaService,
  config,
} from "@wavtopia/core-storage";
import {
  uploadFile,
  deleteFile,
  getLocalFile,
  getObject,
} from "../../services/storage";
import {
  createQueue,
  prisma,
  setupQueueMonitoring,
  standardJobOptions,
} from "./common";

interface WavConversionJob {
  trackId: string;
  type: "full" | "component";
  componentId?: string;
}

// Create queue
export const wavConversionQueue =
  createQueue<WavConversionJob>("wav-conversion");

// Set up monitoring
setupQueueMonitoring(wavConversionQueue, "WAV conversion");

// Utility function to download and buffer a file from storage
async function downloadFileToBuffer(fileUrl: string): Promise<Buffer> {
  const stream = await getObject(fileUrl);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// Utility function to upload a WAV file
async function uploadWavFile(
  buffer: Buffer,
  filename: string,
  directory: string
): Promise<string> {
  return uploadFile(
    {
      buffer,
      originalname: `${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}.wav`,
      mimetype: "audio/wav",
    } as StorageFile,
    directory
  );
}

// Utility function to update WAV conversion status
async function updateWavConversionStatus(
  type: "full" | "component",
  id: string,
  status: WavConversionStatus,
  wavUrl?: string
): Promise<void> {
  if (type === "full") {
    await prisma.track.update({
      where: { id },
      data: {
        wavConversionStatus: status,
        ...(wavUrl && { fullTrackWavUrl: wavUrl }),
      },
    });
  } else {
    await prisma.component.update({
      where: { id },
      data: {
        wavConversionStatus: status,
        ...(wavUrl && { wavUrl }),
      },
    });
  }
}

// Process WAV conversion jobs
wavConversionQueue.process(async (job: Job<WavConversionJob>) => {
  console.log(
    `Processing WAV conversion job ${job.id} for track: ${job.data.trackId}`
  );

  try {
    const { trackId, type, componentId } = job.data;

    // Get the track
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { components: true },
    });

    if (!track) {
      throw new Error(`Track not found: ${trackId}`);
    }

    if (type === "full") {
      if (
        !(
          track.fullTrackFlacUrl ||
          (track.originalFormat === "xm" && track.originalUrl)
        )
      ) {
        throw new Error(
          `Track ${trackId} has no FLAC or original source XM file URL`
        );
      }

      // Update conversion status to IN_PROGRESS for full track conversion
      await updateWavConversionStatus(
        "full",
        trackId,
        WavConversionStatus.IN_PROGRESS
      );

      const wavBuffer = await convertToWav(track, track.fullTrackFlacUrl);

      // Upload WAV file
      const wavUrl = await uploadWavFile(
        wavBuffer,
        `${track.title}_full`,
        "tracks/"
      );

      // Update track with WAV URL and status
      await updateWavConversionStatus(
        "full",
        trackId,
        WavConversionStatus.COMPLETED,
        wavUrl
      );
    } else if (type === "component" && componentId) {
      const component = track.components.find((c) => c.id === componentId);
      if (!component) {
        throw new Error(`Component ${componentId} not found`);
      }

      if (
        !(
          component.flacUrl ||
          (track.originalFormat === "xm" && track.originalUrl)
        )
      ) {
        throw new Error(
          `Component ${componentId} has no FLAC or full track original source XM file URL`
        );
      }

      // Update conversion status to IN_PROGRESS for component conversion
      await updateWavConversionStatus(
        "component",
        componentId,
        WavConversionStatus.IN_PROGRESS
      );

      const componentIndex = track.components.findIndex(
        (c) => c.id === componentId
      );

      const wavBuffer = await convertToWav(
        track,
        component.flacUrl,
        componentIndex
      );

      // Upload WAV file
      const wavUrl = await uploadWavFile(
        wavBuffer,
        `${track.title}_${component.name}`,
        "components/"
      );

      // Update component with WAV URL and status
      await updateWavConversionStatus(
        "component",
        componentId,
        WavConversionStatus.COMPLETED,
        wavUrl
      );
    }

    console.log(`WAV conversion completed for track ${trackId}`);
  } catch (error) {
    console.error(`Error processing WAV conversion job ${job.id}:`, error);

    if (job.data.type === "full") {
      await updateWavConversionStatus(
        "full",
        job.data.trackId,
        WavConversionStatus.FAILED
      );
    } else if (job.data.type === "component" && job.data.componentId) {
      await updateWavConversionStatus(
        "component",
        job.data.componentId,
        WavConversionStatus.FAILED
      );
    }

    throw error;
  }
});

// Add WAV conversion job to queue
export const queueWavConversion = async (
  trackId: string,
  type: "full" | "component",
  componentId?: string
) => {
  const job = await wavConversionQueue.add(
    {
      trackId,
      type,
      componentId,
    },
    standardJobOptions
  );

  return job.id;
};

// Utility function to convert to WAV from either FLAC or XM source
async function convertToWav(
  track: {
    originalUrl: string | null;
    originalFormat: string | null;
    fullTrackFlacUrl: string | null;
  },
  flacUrl?: string | null,
  componentIndex?: number
): Promise<Buffer> {
  // Try FLAC path first
  if (flacUrl) {
    console.log("FLAC file found, converting from FLAC to WAV");
    const flacBuffer = await downloadFileToBuffer(flacUrl);
    return convertFLACToWAV(flacBuffer);
  } else if (track.originalFormat === "xm" && track.originalUrl) {
    console.log("No FLAC file found, converting from XM to WAV");
    const sourceBuffer = await downloadFileToBuffer(track.originalUrl);

    const converted = await convertXMToWAV(sourceBuffer);

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
      return components[componentIndex].buffer;
    } else {
      return converted.fullTrackWavBuffer;
    }
  }

  throw new Error("No valid source found for WAV conversion");
}
