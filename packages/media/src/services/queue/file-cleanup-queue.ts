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
  timeframe?: {
    value: number;
    unit: "days" | "hours" | "minutes" | "seconds";
  };
}

function getThresholdDate(timeframe?: FileCleanupJob["timeframe"]): Date {
  const now = new Date();

  if (!timeframe) {
    // Default to 7 days
    now.setDate(now.getDate() - 7);
    return now;
  }

  const { value, unit } = timeframe;

  switch (unit) {
    case "days":
      now.setDate(now.getDate() - value);
      break;
    case "hours":
      now.setHours(now.getHours() - value);
      break;
    case "minutes":
      now.setMinutes(now.getMinutes() - value);
      break;
    case "seconds":
      now.setSeconds(now.getSeconds() - value);
      break;
  }

  return now;
}

async function fileCleanupProcessor(job: Job<FileCleanupJob>) {
  console.log(`Processing cleanup job ${job.id}`);

  const thresholdDate = getThresholdDate(job.data.timeframe);
  const timeframeStr = job.data.timeframe
    ? `${job.data.timeframe.value} ${job.data.timeframe.unit}`
    : "7 days";

  console.log(
    `Cleaning up files older than ${timeframeStr} (before ${thresholdDate.toISOString()})`
  );

  try {
    // Find all tracks with WAV or FLAC files that haven't been accessed within threshold
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
                    wavLastRequestedAt: { lt: thresholdDate },
                  },
                  {
                    fullTrackFlacUrl: { not: null },
                    flacLastRequestedAt: { lt: thresholdDate },
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
                        wavLastRequestedAt: { lt: thresholdDate },
                      },
                      {
                        flacUrl: { not: null },
                        flacLastRequestedAt: { lt: thresholdDate },
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
        track.wavLastRequestedAt < thresholdDate
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
        track.flacLastRequestedAt < thresholdDate
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
          component.wavLastRequestedAt < thresholdDate
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
          component.flacLastRequestedAt < thresholdDate
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
    {
      type: "scheduled-cleanup",
      timeframe: { value: 7, unit: "days" },
    },
    {
      ...standardJobOptions,
      repeat: {
        pattern: "0 0 * * *", // Run at midnight every day
      },
    }
  );
}

// Function to run cleanup job on demand
export async function runCleanupJobNow(timeframe?: {
  value: number;
  unit: "days" | "hours" | "minutes" | "seconds";
}) {
  const job = await fileCleanupQueue.add(
    "scheduled-cleanup",
    {
      type: "scheduled-cleanup",
      timeframe,
    },
    standardJobOptions
  );
  return job.id;
}
