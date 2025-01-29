import Queue, { Job } from "bull";
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

interface ConversionJob {
  trackId: string;
}

interface WavConversionJob {
  trackId: string;
  type: "full" | "component";
  componentId?: string;
}

const prisma = new PrismaService(config.database).db;

// Create queues
export const conversionQueue = new Queue<ConversionJob>("audio-conversion", {
  redis: config.redis,
});

export const wavConversionQueue = new Queue<WavConversionJob>(
  "wav-conversion",
  {
    redis: config.redis,
  }
);

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

    // Generate waveform data for full track
    console.log("Generating waveform data for full track...");
    const waveformResult = await generateWaveformData(fullTrackWavBuffer);
    console.log("Full track waveform data generated");

    // Convert full track to MP3
    console.log("Converting full track to MP3...");
    const fullTrackMp3Buffer = await convertWAVToMP3(fullTrackWavBuffer);
    console.log("Full track MP3 conversion complete");

    // Upload full track files, MP3 and FLAC. WAV is not uploaded, to save space.
    // It can be converted from FLAC on demand.
    console.log("Uploading full track files...");
    const fullTrackMp3Url = await uploadFile(
      {
        buffer: fullTrackMp3Buffer,
        originalname: `${originalName}_full.mp3`,
        mimetype: "audio/mpeg",
      } as StorageFile,
      "tracks/"
    );
    console.log("Full track MP3 uploaded");

    // Convert and upload component files
    console.log("Processing components...");
    const componentUploads = await Promise.all(
      components.map(async (component, index) => {
        console.log(
          `Processing component ${index + 1}/${components.length}: ${
            component.name
          }`
        );
        const mp3Buffer = await convertWAVToMP3(component.buffer);
        const componentName = `${originalName}_${component.name.replace(
          /[^a-z0-9]/gi,
          "_"
        )}`;

        const waveformResult = await generateWaveformData(component.buffer);
        console.log(`Generated waveform data for component: ${component.name}`);

        const mp3Url = await uploadFile(
          {
            buffer: mp3Buffer,
            originalname: `${componentName}.mp3`,
            mimetype: "audio/mpeg",
          } as StorageFile,
          "components/"
        );

        console.log(`Component ${component.name} MP3 uploaded`);
        return {
          name: component.name,
          type: component.type,
          mp3Url,
          waveformData: waveformResult.peaks,
          duration: waveformResult.duration,
        };
      })
    );

    // Update database record
    console.log("Updating database record...");
    try {
      const track = await prisma.track.update({
        where: { id: trackId },
        data: {
          originalUrl,
          fullTrackMp3Url,
          waveformData: waveformResult.peaks,
          duration: waveformResult.duration,
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
      console.log("Cleaning up uploaded files...");
      try {
        await Promise.all([
          deleteFile(originalUrl),
          deleteFile(fullTrackMp3Url),
          ...(coverArtUrl ? [deleteFile(coverArtUrl)] : []),
          ...componentUploads.flatMap((comp) => [deleteFile(comp.mp3Url)]),
        ]);
        console.log("Cleanup completed");
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
      }

      // Check for disk space error
      if (
        typeof dbError === "object" &&
        dbError !== null &&
        "code" in dbError &&
        dbError.code === "53100"
      ) {
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
      await prisma.track.update({
        where: { id: trackId },
        data: { wavConversionStatus: WavConversionStatus.IN_PROGRESS },
      });

      let wavBuffer: Buffer;

      // Try FLAC path first
      if (track.fullTrackFlacUrl) {
        console.log("FLAC file found, converting from FLAC to WAV");
        // Download FLAC file from storage
        const flacBuffer = await downloadFileToBuffer(track.fullTrackFlacUrl);

        // Convert FLAC to WAV
        wavBuffer = await convertFLACToWAV(flacBuffer);
      } else if (track.originalUrl) {
        console.log("No FLAC file found, converting from XM to WAV");
        // Download original XM file from storage
        const sourceBuffer = await downloadFileToBuffer(track.originalUrl);

        // Convert XM to WAV
        const { fullTrackWavBuffer } = await convertXMToWAV(sourceBuffer);
        wavBuffer = fullTrackWavBuffer;
      } else {
        throw new Error(
          `Failed to find FLAC or original source XM file for track ${trackId}`
        );
      }

      // Upload WAV file
      const wavUrl = await uploadWavFile(
        wavBuffer,
        `${track.title}_full`,
        "tracks/"
      );

      // Update track with WAV URL and status
      await prisma.track.update({
        where: { id: trackId },
        data: {
          fullTrackWavUrl: wavUrl,
          wavConversionStatus: WavConversionStatus.COMPLETED,
        },
      });
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
      await prisma.component.update({
        where: { id: componentId },
        data: { wavConversionStatus: WavConversionStatus.IN_PROGRESS },
      });

      let wavBuffer: Buffer;

      // Try FLAC path first
      if (component.flacUrl) {
        console.log(
          "FLAC file found for component, converting from FLAC to WAV"
        );
        // Download FLAC file from storage
        const flacBuffer = await downloadFileToBuffer(component.flacUrl);

        // Convert FLAC to WAV
        wavBuffer = await convertFLACToWAV(flacBuffer);
      } else if (track.originalUrl) {
        console.log(
          "No FLAC file found for component, converting from XM to WAV"
        );
        // Download original XM file from storage
        const sourceBuffer = await downloadFileToBuffer(track.originalUrl);

        // Convert XM to WAV and get the specific component
        // TODO: We might want to retain all components, seeing as the user has
        // expressed an interest in this track.
        const { components } = await convertXMToWAV(sourceBuffer);

        // Find the matching component by name
        const componentIndex = track.components.findIndex(
          (c) => c.id === componentId
        );
        if (componentIndex === -1 || !components[componentIndex]) {
          throw new Error(
            `Could not find matching WAV component for ${componentId}`
          );
        }

        wavBuffer = components[componentIndex].buffer;
      } else {
        throw new Error(
          `Failed to find FLAC or original source XM file for track ${trackId} and component ${componentId}`
        );
      }

      // Upload WAV file
      const wavUrl = await uploadWavFile(
        wavBuffer,
        `${track.title}_${component.name}`,
        "components/"
      );

      // Update component with WAV URL and status
      await prisma.component.update({
        where: { id: componentId },
        data: {
          wavUrl,
          wavConversionStatus: WavConversionStatus.COMPLETED,
        },
      });
    }

    console.log(`WAV conversion completed for track ${trackId}`);
  } catch (error) {
    console.error(`Error processing WAV conversion job ${job.id}:`, error);

    if (job.data.type === "full") {
      await prisma.track.update({
        where: { id: job.data.trackId },
        data: { wavConversionStatus: WavConversionStatus.FAILED },
      });
    } else if (job.data.type === "component" && job.data.componentId) {
      await prisma.component.update({
        where: { id: job.data.componentId },
        data: { wavConversionStatus: WavConversionStatus.FAILED },
      });
    }

    throw error;
  }
});

// Add job to queue
export const queueConversion = async (trackId: string) => {
  const job = await conversionQueue.add(
    {
      trackId,
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    }
  );

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
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    }
  );

  return job.id;
};

// Event handlers for monitoring
conversionQueue.on("completed", (job: Job<ConversionJob>) => {
  console.log(`Job ${job.id} completed successfully`);
});

conversionQueue.on("failed", (job: Job<ConversionJob>, error: Error) => {
  console.error(`Job ${job.id} failed:`, error);
});
