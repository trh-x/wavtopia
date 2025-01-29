import Queue, { Job, QueueOptions } from "bull";
import { convertXMToWAV } from "../services/wav-converter";
import { convertWAVToMP3 } from "../services/mp3-converter";
import { convertWAVToFLAC, convertFLACToWAV } from "../services/flac-converter";
import { generateWaveformData } from "../services/waveform";
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
} from "../services/storage";

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

// Utility function to upload an MP3 file
async function uploadMp3File(
  buffer: Buffer,
  filename: string,
  directory: string
): Promise<string> {
  return uploadFile(
    {
      buffer,
      originalname: `${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}.mp3`,
      mimetype: "audio/mpeg",
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

interface ConversionJob {
  trackId: string;
}

interface WavConversionJob {
  trackId: string;
  type: "full" | "component";
  componentId?: string;
}

const prisma = new PrismaService(config.database).db;

// Utility function to create a queue with standard configuration
function createQueue<T>(name: string): Queue.Queue<T> {
  return new Queue<T>(name, {
    redis: config.redis,
  });
}

// Utility function to set up queue monitoring
function setupQueueMonitoring<T>(queue: Queue.Queue<T>, name: string): void {
  queue.on("completed", (job: Job<T>) => {
    console.log(`${name} job ${job.id} completed successfully`);
  });

  queue.on("failed", (job: Job<T>, error: Error) => {
    console.error(`${name} job ${job.id} failed:`, error);
  });
}

// Create queues
export const conversionQueue = createQueue<ConversionJob>("audio-conversion");
export const wavConversionQueue =
  createQueue<WavConversionJob>("wav-conversion");

// Set up monitoring for both queues
setupQueueMonitoring(conversionQueue, "Conversion");
setupQueueMonitoring(wavConversionQueue, "WAV conversion");

// Utility function to clean up uploaded files
async function cleanupUploadedFiles(
  files: (string | undefined)[]
): Promise<void> {
  console.log("Cleaning up uploaded files...");
  try {
    await Promise.all(
      files.filter((f): f is string => !!f).map((file) => deleteFile(file))
    );
    console.log("Cleanup completed");
  } catch (cleanupError) {
    console.error("Error during cleanup:", cleanupError);
  }
}

// Utility function to check for disk space error
function isDiskSpaceError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "53100"
  );
}

// Utility function to process a component
async function processComponent(
  component: { buffer: Buffer; name: string; type: string },
  originalName: string,
  index: number,
  totalCount: number
): Promise<{
  name: string;
  type: string;
  mp3Url: string;
  waveformData: number[];
  duration: number;
}> {
  console.log(
    `Processing component ${index + 1}/${totalCount}: ${component.name}`
  );

  const mp3Buffer = await convertWAVToMP3(component.buffer);
  const componentName = `${originalName}_${component.name.replace(
    /[^a-z0-9]/gi,
    "_"
  )}`;

  const waveformResult = await generateWaveformData(component.buffer);
  console.log(`Generated waveform data for component: ${component.name}`);

  const mp3Url = await uploadMp3File(mp3Buffer, componentName, "components/");

  console.log(`Component ${component.name} MP3 uploaded`);
  return {
    name: component.name,
    type: component.type,
    mp3Url,
    waveformData: waveformResult.peaks,
    duration: waveformResult.duration,
  };
}

// Utility function to process full track
async function processFullTrack(
  buffer: Buffer,
  originalName: string
): Promise<{
  mp3Url: string;
  waveformData: number[];
  duration: number;
}> {
  // Generate waveform data for full track
  console.log("Generating waveform data for full track...");
  const waveformResult = await generateWaveformData(buffer);
  console.log("Full track waveform data generated");

  // Convert full track to MP3
  console.log("Converting full track to MP3...");
  const mp3Buffer = await convertWAVToMP3(buffer);
  console.log("Full track MP3 conversion complete");

  // Upload MP3 file
  console.log("Uploading full track MP3 file...");
  const mp3Url = await uploadMp3File(
    mp3Buffer,
    `${originalName}_full`,
    "tracks/"
  );
  console.log("Full track MP3 uploaded");

  return {
    mp3Url,
    waveformData: waveformResult.peaks,
    duration: waveformResult.duration,
  };
}

// Process jobs
conversionQueue.process(async (job: Job<ConversionJob>) => {
  console.log(
    `Processing conversion job ${job.id} for track: ${job.data.trackId}`
  );

  try {
    const { trackId } = job.data;

    // First check if track exists
    const track = await prisma.track.findUnique({
      where: { id: trackId },
    });

    if (!track) {
      throw new Error(`Track not found: ${trackId}`);
    }

    if (!track.originalUrl) {
      throw new Error(`Track ${trackId} has no original file URL`);
    }

    const originalFile = await getLocalFile(track.originalUrl);
    // TODO: Retain the original file name from the point of upload
    const originalName = track.title.replace(/[^a-zA-Z0-9._-]/g, "_");
    // const originalName = track.originalUrl.replace(/\.[^/.]+$/, "");

    const coverArtFile = track.coverArt
      ? await getLocalFile(track.coverArt)
      : undefined;

    // Upload original file
    console.log("Uploading original file...");
    const originalUrl = await uploadFile(originalFile, "originals/");
    console.log("Original file uploaded:", originalUrl);

    // Upload cover art if provided
    let coverArtUrl: string | undefined;
    if (coverArtFile) {
      console.log("Uploading cover art...");
      coverArtUrl = await uploadFile(coverArtFile, "covers/");
      console.log("Cover art uploaded:", coverArtUrl);
    }

    // Convert XM to WAV
    console.log("Converting XM to WAV...");
    const { fullTrackWavBuffer, components } = await convertXMToWAV(
      originalFile.buffer
    );
    console.log("XM conversion complete. Components:", components.length);

    const {
      mp3Url: fullTrackMp3Url,
      waveformData,
      duration,
    } = await processFullTrack(fullTrackWavBuffer, originalName);

    // Convert and upload component files
    console.log("Processing components...");
    const componentUploads = await Promise.all(
      components.map((component, index) =>
        processComponent(component, originalName, index, components.length)
      )
    );

    // Update database record
    console.log("Updating database record...");
    try {
      const track = await prisma.track.update({
        where: { id: trackId },
        data: {
          originalUrl,
          fullTrackMp3Url,
          waveformData,
          duration,
          coverArt: coverArtUrl,
          components: {
            create: componentUploads,
          },
        },
      });

      console.log("Track updated successfully:", track.id);
    } catch (dbError) {
      console.error("Database error during track creation:", dbError);

      // Clean up uploaded files if database operation fails
      await cleanupUploadedFiles([
        originalUrl,
        fullTrackMp3Url,
        coverArtUrl,
        ...componentUploads.map((comp) => comp.mp3Url),
      ]);

      if (isDiskSpaceError(dbError)) {
        console.error("Insufficient storage space.");
      }
      throw dbError;
    }
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
    throw error;
  }
});

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

// Standard job options for all queues
const standardJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 1000,
  },
};

// Add job to queue
export const queueConversion = async (trackId: string) => {
  const job = await conversionQueue.add({ trackId }, standardJobOptions);

  return job.id;
};

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
