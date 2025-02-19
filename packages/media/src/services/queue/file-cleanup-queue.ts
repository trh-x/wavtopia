import { Job, Worker } from "bullmq";
import { SourceFormat, StorageFile, config } from "@wavtopia/core-storage";
import { deleteFile } from "../storage";
import {
  createQueue,
  prisma,
  setupQueueMonitoring,
  standardJobOptions,
} from "./common";

// Create queue
export const fileCleanupQueue = createQueue("file-cleanup");

// Set up monitoring
setupQueueMonitoring(fileCleanupQueue, "File Cleanup");

interface FileCleanupJob {
  type: "scheduled-cleanup";
}

async function fileCleanupProcessor(job: Job<FileCleanupJob>) {
  console.log(`Processing cleanup job ${job.id}`);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  try {
    // Find all tracks with WAV or FLAC files that haven't been accessed in over a week
    const tracksToClean = await prisma.track.findMany({
      where: {
        AND: [
          {
            originalFormat: {
              in: [SourceFormat.IT, SourceFormat.MOD, SourceFormat.XM],
            },
          },
          {
            OR: [
              // Track has old WAV/FLAC files
              {
                OR: [
                  {
                    fullTrackWavUrl: { not: null },
                    wavLastRequestedAt: { lt: oneWeekAgo },
                  },
                  {
                    fullTrackFlacUrl: { not: null },
                    flacLastRequestedAt: { lt: oneWeekAgo },
                  },
                ],
              },
              // Track has components with old WAV/FLAC files
              {
                components: {
                  some: {
                    OR: [
                      {
                        wavUrl: { not: null },
                        wavLastRequestedAt: { lt: oneWeekAgo },
                      },
                      {
                        flacUrl: { not: null },
                        flacLastRequestedAt: { lt: oneWeekAgo },
                      },
                    ],
                  },
                },
              },
            ],
          },
        ],
      },
      include: {
        components: true,
      },
    });

    console.log(`Found ${tracksToClean.length} tracks to clean up`);

    for (const track of tracksToClean) {
      // Process full track files
      if (
        track.fullTrackWavUrl &&
        track.wavLastRequestedAt &&
        track.wavLastRequestedAt < oneWeekAgo
      ) {
        await deleteFile(track.fullTrackWavUrl);
        await prisma.track.update({
          where: { id: track.id },
          data: {
            fullTrackWavUrl: null,
            wavLastRequestedAt: null,
            wavCreatedAt: null,
          },
        });
      }

      if (
        track.fullTrackFlacUrl &&
        track.flacLastRequestedAt &&
        track.flacLastRequestedAt < oneWeekAgo
      ) {
        await deleteFile(track.fullTrackFlacUrl);
        await prisma.track.update({
          where: { id: track.id },
          data: {
            fullTrackFlacUrl: null,
            flacLastRequestedAt: null,
            flacCreatedAt: null,
          },
        });
      }

      // Process component files
      for (const component of track.components) {
        if (
          component.wavUrl &&
          component.wavLastRequestedAt &&
          component.wavLastRequestedAt < oneWeekAgo
        ) {
          await deleteFile(component.wavUrl);
          await prisma.component.update({
            where: { id: component.id },
            data: {
              wavUrl: null,
              wavLastRequestedAt: null,
              wavCreatedAt: null,
            },
          });
        }

        if (
          component.flacUrl &&
          component.flacLastRequestedAt &&
          component.flacLastRequestedAt < oneWeekAgo
        ) {
          await deleteFile(component.flacUrl);
          await prisma.component.update({
            where: { id: component.id },
            data: {
              flacUrl: null,
              flacLastRequestedAt: null,
              flacCreatedAt: null,
            },
          });
        }
      }
    }

    console.log("Cleanup completed successfully");
  } catch (error) {
    console.error("Error during file cleanup:", error);
    throw error;
  }
}

// Process cleanup jobs
export const worker = new Worker<FileCleanupJob>(
  "file-cleanup",
  fileCleanupProcessor,
  {
    connection: config.redis,
  }
);

// Cleanup function for graceful shutdown
export async function cleanup(): Promise<void> {
  await worker.close();
}

// Schedule the cleanup job to run daily at midnight
export async function scheduleCleanupJob() {
  await fileCleanupQueue.add(
    "scheduled-cleanup",
    { type: "scheduled-cleanup" },
    {
      ...standardJobOptions,
      repeat: {
        pattern: "0 0 * * *", // Run at midnight every day
      },
    }
  );
}
