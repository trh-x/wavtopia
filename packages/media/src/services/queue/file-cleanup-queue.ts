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

  // Initialize counters for summary
  const summary = {
    fullTrackWav: 0,
    fullTrackFlac: 0,
    componentWav: 0,
    componentFlac: 0,
  };

  try {
    const BATCH_SIZE = 50;

    // Find tracks to clean up, get one more than batch size to check if more work remains
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
              // Track WAV file conditions
              {
                fullTrackWavUrl: { not: null },
                wavLastRequestedAt: { lt: thresholdDate },
              },
              // Track FLAC file conditions
              {
                fullTrackFlacUrl: { not: null },
                flacLastRequestedAt: { lt: thresholdDate },
              },
              // Component WAV file conditions
              {
                components: {
                  some: {
                    wavUrl: { not: null },
                    wavLastRequestedAt: { lt: thresholdDate },
                  },
                },
              },
              // Component FLAC file conditions
              {
                components: {
                  some: {
                    flacUrl: { not: null },
                    flacLastRequestedAt: { lt: thresholdDate },
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
      take: BATCH_SIZE + 1,
      orderBy: { id: "asc" },
    });

    // Process only BATCH_SIZE tracks
    const tracksToProcess = tracksToClean.slice(0, BATCH_SIZE);
    const hasMoreTracks = tracksToClean.length > BATCH_SIZE;

    console.log(`Processing batch of ${tracksToProcess.length} tracks`);

    for (const track of tracksToProcess) {
      await prisma.$transaction(async (tx) => {
        // Process full track files
        if (
          track.fullTrackWavUrl &&
          track.wavLastRequestedAt &&
          track.wavLastRequestedAt < thresholdDate
        ) {
          await deleteFile(track.fullTrackWavUrl);
          await tx.track.update({
            where: { id: track.id },
            data: {
              fullTrackWavUrl: null,
              wavLastRequestedAt: null,
              wavCreatedAt: null,
            },
          });
          summary.fullTrackWav++;
        }

        if (
          track.fullTrackFlacUrl &&
          track.flacLastRequestedAt &&
          track.flacLastRequestedAt < thresholdDate
        ) {
          await deleteFile(track.fullTrackFlacUrl);
          await tx.track.update({
            where: { id: track.id },
            data: {
              fullTrackFlacUrl: null,
              flacLastRequestedAt: null,
              flacCreatedAt: null,
            },
          });
          summary.fullTrackFlac++;
        }

        // Process component files
        const componentUpdates = [];
        for (const component of track.components) {
          if (
            component.wavUrl &&
            component.wavLastRequestedAt &&
            component.wavLastRequestedAt < thresholdDate
          ) {
            await deleteFile(component.wavUrl);
            componentUpdates.push(
              tx.component.update({
                where: { id: component.id },
                data: {
                  wavUrl: null,
                  wavLastRequestedAt: null,
                  wavCreatedAt: null,
                },
              })
            );
            summary.componentWav++;
          }

          if (
            component.flacUrl &&
            component.flacLastRequestedAt &&
            component.flacLastRequestedAt < thresholdDate
          ) {
            await deleteFile(component.flacUrl);
            componentUpdates.push(
              tx.component.update({
                where: { id: component.id },
                data: {
                  flacUrl: null,
                  flacLastRequestedAt: null,
                  flacCreatedAt: null,
                },
              })
            );
            summary.componentFlac++;
          }
        }

        // Execute all component updates in parallel within the transaction
        if (componentUpdates.length > 0) {
          await Promise.all(componentUpdates);
        }
      });
    }

    const totalFiles = Object.values(summary).reduce((a, b) => a + b, 0);
    console.log("\nCleanup Summary:");
    console.log("---------------");
    console.log(`Full Track WAV files removed: ${summary.fullTrackWav}`);
    console.log(`Full Track FLAC files removed: ${summary.fullTrackFlac}`);
    console.log(`Component WAV files removed: ${summary.componentWav}`);
    console.log(`Component FLAC files removed: ${summary.componentFlac}`);
    console.log("---------------");
    console.log(`Total files removed: ${totalFiles}`);

    // If there are more tracks to process, queue another job
    if (hasMoreTracks) {
      console.log(
        "More tracks to process, queueing next batch to cleanup in 1 minute..."
      );
      await fileCleanupQueue.add(
        "scheduled-cleanup",
        {
          type: "scheduled-cleanup",
          timeframe: job.data.timeframe,
        },
        {
          ...standardJobOptions,
          delay: 60000, // Wait 1 minute before processing next batch
        }
      );
    }

    console.log("\nCleanup completed successfully");
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
