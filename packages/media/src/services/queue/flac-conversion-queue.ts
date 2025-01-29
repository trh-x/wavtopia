import { Job } from "bull";
import { convertXMToWAV } from "../../services/wav-converter";
import { convertWAVToFLAC } from "../../services/flac-converter";
import { StorageFile, FlacConversionStatus } from "@wavtopia/core-storage";
import { uploadFile, getObject } from "../../services/storage";
import {
  createQueue,
  prisma,
  setupQueueMonitoring,
  standardJobOptions,
} from "./common";

// TODO: DRY this with wav-conversion-queue.ts

interface FlacConversionJob {
  trackId: string;
  type: "full" | "component";
  componentId?: string;
}

// Create queue
export const flacConversionQueue =
  createQueue<FlacConversionJob>("flac-conversion");

// Set up monitoring
setupQueueMonitoring(flacConversionQueue, "FLAC conversion");

// Utility function to download and buffer a file from storage
async function downloadFileToBuffer(fileUrl: string): Promise<Buffer> {
  const stream = await getObject(fileUrl);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// Utility function to upload a FLAC file
async function uploadFlacFile(
  buffer: Buffer,
  filename: string,
  directory: string
): Promise<string> {
  return uploadFile(
    {
      buffer,
      originalname: `${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}.flac`,
      mimetype: "audio/flac",
    } as StorageFile,
    directory
  );
}

// Utility function to update FLAC conversion status
async function updateFlacConversionStatus(
  type: "full" | "component",
  id: string,
  status: FlacConversionStatus,
  flacUrl?: string
): Promise<void> {
  if (type === "full") {
    await prisma.track.update({
      where: { id },
      data: {
        flacConversionStatus: status,
        ...(flacUrl && { fullTrackFlacUrl: flacUrl }),
      },
    });
  } else {
    await prisma.component.update({
      where: { id },
      data: {
        flacConversionStatus: status,
        ...(flacUrl && { flacUrl }),
      },
    });
  }
}

// Process FLAC conversion jobs
flacConversionQueue.process(async (job: Job<FlacConversionJob>) => {
  console.log(
    `Processing FLAC conversion job ${job.id} for track: ${job.data.trackId}`
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
      // Update conversion status to IN_PROGRESS for full track conversion
      await updateFlacConversionStatus(
        "full",
        trackId,
        FlacConversionStatus.IN_PROGRESS
      );

      let wavBuffer: Buffer;

      // Try to get WAV source first
      if (track.fullTrackWavUrl) {
        console.log("WAV file found, converting from WAV to FLAC");
        wavBuffer = await downloadFileToBuffer(track.fullTrackWavUrl);
      } else if (track.originalFormat === "xm" && track.originalUrl) {
        console.log("No WAV file found, converting from XM to WAV first");
        const sourceBuffer = await downloadFileToBuffer(track.originalUrl);
        const converted = await convertXMToWAV(sourceBuffer);
        wavBuffer = converted.fullTrackWavBuffer;
      } else {
        throw new Error("No valid source found for FLAC conversion");
      }

      // Convert to FLAC
      const flacBuffer = await convertWAVToFLAC(wavBuffer);

      // Upload FLAC file
      const flacUrl = await uploadFlacFile(
        flacBuffer,
        `${track.title}_full`,
        "tracks/"
      );

      // Update track with FLAC URL and status
      await updateFlacConversionStatus(
        "full",
        trackId,
        FlacConversionStatus.COMPLETED,
        flacUrl
      );
    } else if (type === "component" && componentId) {
      const component = track.components.find((c) => c.id === componentId);
      if (!component) {
        throw new Error(`Component ${componentId} not found`);
      }

      // Update conversion status to IN_PROGRESS for component conversion
      await updateFlacConversionStatus(
        "component",
        componentId,
        FlacConversionStatus.IN_PROGRESS
      );

      let wavBuffer: Buffer;

      // Try to get WAV source first
      if (component.wavUrl) {
        console.log("WAV file found, converting from WAV to FLAC");
        wavBuffer = await downloadFileToBuffer(component.wavUrl);
      } else if (track.originalFormat === "xm" && track.originalUrl) {
        console.log("No WAV file found, converting from XM to WAV first");
        const sourceBuffer = await downloadFileToBuffer(track.originalUrl);
        const converted = await convertXMToWAV(sourceBuffer);

        const componentIndex = track.components.findIndex(
          (c) => c.id === componentId
        );
        if (!converted.components[componentIndex]) {
          throw new Error(
            `Could not find matching WAV component at index ${componentIndex}`
          );
        }
        wavBuffer = converted.components[componentIndex].buffer;
      } else {
        throw new Error("No valid source found for FLAC conversion");
      }

      // Convert to FLAC
      const flacBuffer = await convertWAVToFLAC(wavBuffer);

      // Upload FLAC file
      const flacUrl = await uploadFlacFile(
        flacBuffer,
        `${track.title}_${component.name}`,
        "components/"
      );

      // Update component with FLAC URL and status
      await updateFlacConversionStatus(
        "component",
        componentId,
        FlacConversionStatus.COMPLETED,
        flacUrl
      );
    }

    console.log(`FLAC conversion completed for track ${trackId}`);
  } catch (error) {
    console.error(`Error processing FLAC conversion job ${job.id}:`, error);

    if (job.data.type === "full") {
      await updateFlacConversionStatus(
        "full",
        job.data.trackId,
        FlacConversionStatus.FAILED
      );
    } else if (job.data.type === "component" && job.data.componentId) {
      await updateFlacConversionStatus(
        "component",
        job.data.componentId,
        FlacConversionStatus.FAILED
      );
    }

    throw error;
  }
});

// Add FLAC conversion job to queue
export const queueFlacConversion = async (
  trackId: string,
  type: "full" | "component",
  componentId?: string
) => {
  const job = await flacConversionQueue.add(
    {
      trackId,
      type,
      componentId,
    },
    standardJobOptions
  );

  return job.id;
};
