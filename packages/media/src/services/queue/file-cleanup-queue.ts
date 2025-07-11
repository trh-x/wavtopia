import { Job, Worker } from "bullmq";
import { Prisma, SourceFormat, config } from "@wavtopia/core-storage";
import { retryableDeleteFile, FileCleanupError } from "../storage/deletion";
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

interface CleanupFailure {
  fileUrl: string;
  error: Error;
  type: "track-wav" | "track-flac" | "stem-wav" | "stem-flac";
  entityId: string;
}

interface DeletionOperation {
  fileUrl: string;
  type: "track-wav" | "track-flac" | "stem-wav" | "stem-flac";
  entityId: string;
  updateFn: () => Promise<any>;
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
    stemWav: 0,
    stemFlac: 0,
    failures: [] as CleanupFailure[],
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
              // Stem WAV file conditions
              {
                stems: {
                  some: {
                    wavUrl: { not: null },
                    wavLastRequestedAt: { lt: thresholdDate },
                  },
                },
              },
              // Stem FLAC file conditions
              {
                stems: {
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
        stems: true,
      },
      take: BATCH_SIZE + 1,
      orderBy: { id: "asc" },
    });

    // Process only BATCH_SIZE tracks
    const tracksToProcess = tracksToClean.slice(0, BATCH_SIZE);
    const hasMoreTracks = tracksToClean.length > BATCH_SIZE;

    console.log(`Processing batch of ${tracksToProcess.length} tracks`);

    for (const track of tracksToProcess) {
      try {
        await prisma.$transaction(async (tx) => {
          // Prepare all deletion operations
          const deletionOps: DeletionOperation[] = [];

          // Add track WAV deletion if needed
          if (
            track.fullTrackWavUrl &&
            track.wavLastRequestedAt &&
            track.wavLastRequestedAt < thresholdDate
          ) {
            deletionOps.push({
              fileUrl: track.fullTrackWavUrl,
              type: "track-wav",
              entityId: track.id,
              updateFn: () =>
                tx.track.update({
                  where: { id: track.id },
                  data: {
                    fullTrackWavUrl: null,
                    wavLastRequestedAt: null,
                    wavCreatedAt: null,
                    wavSizeBytes: null,
                  },
                }),
            });
          }

          // Add track FLAC deletion if needed
          if (
            track.fullTrackFlacUrl &&
            track.flacLastRequestedAt &&
            track.flacLastRequestedAt < thresholdDate
          ) {
            deletionOps.push({
              fileUrl: track.fullTrackFlacUrl,
              type: "track-flac",
              entityId: track.id,
              updateFn: () =>
                tx.track.update({
                  where: { id: track.id },
                  data: {
                    fullTrackFlacUrl: null,
                    flacLastRequestedAt: null,
                    flacCreatedAt: null,
                    flacSizeBytes: null,
                  },
                }),
            });
          }

          // Add stem deletions if needed
          for (const stem of track.stems) {
            if (
              stem.wavUrl &&
              stem.wavLastRequestedAt &&
              stem.wavLastRequestedAt < thresholdDate
            ) {
              deletionOps.push({
                fileUrl: stem.wavUrl,
                type: "stem-wav",
                entityId: stem.id,
                updateFn: () =>
                  tx.stem.update({
                    where: { id: stem.id },
                    data: {
                      wavUrl: null,
                      wavLastRequestedAt: null,
                      wavCreatedAt: null,
                      wavSizeBytes: null,
                    },
                  }),
              });
            }

            if (
              stem.flacUrl &&
              stem.flacLastRequestedAt &&
              stem.flacLastRequestedAt < thresholdDate
            ) {
              deletionOps.push({
                fileUrl: stem.flacUrl,
                type: "stem-flac",
                entityId: stem.id,
                updateFn: () =>
                  tx.stem.update({
                    where: { id: stem.id },
                    data: {
                      flacUrl: null,
                      flacLastRequestedAt: null,
                      flacCreatedAt: null,
                      flacSizeBytes: null,
                    },
                  }),
              });
            }
          }

          // Execute all deletions in batches
          const DELETION_BATCH_SIZE = 3; // Process 3 files at a time
          for (let i = 0; i < deletionOps.length; i += DELETION_BATCH_SIZE) {
            const batch = deletionOps.slice(i, i + DELETION_BATCH_SIZE);
            const results = await Promise.allSettled(
              batch.map(async (op) => {
                try {
                  await retryableDeleteFile(op.fileUrl);
                  await op.updateFn();
                  // Update summary based on type
                  switch (op.type) {
                    case "track-wav":
                      summary.fullTrackWav++;
                      break;
                    case "track-flac":
                      summary.fullTrackFlac++;
                      break;
                    case "stem-wav":
                      summary.stemWav++;
                      break;
                    case "stem-flac":
                      summary.stemFlac++;
                      break;
                  }
                } catch (error) {
                  summary.failures.push({
                    fileUrl: op.fileUrl,
                    error:
                      error instanceof Error ? error : new Error(String(error)),
                    type: op.type,
                    entityId: op.entityId,
                  });
                }
              })
            );

            if (batch.length === DELETION_BATCH_SIZE) {
              console.log(
                `Processed batch of ${DELETION_BATCH_SIZE} deletions`
              );
            } else {
              console.log(`Processed final batch of ${batch.length} deletions`);
            }
          }
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          console.error(`Database error processing track ${track.id}:`, error);
          // Continue with next track
        } else {
          throw error; // Re-throw unexpected errors
        }
      }
    }

    const totalFiles =
      summary.fullTrackWav +
      summary.fullTrackFlac +
      summary.stemWav +
      summary.stemFlac;

    console.log("\nCleanup Summary:");
    console.log("---------------");
    console.log(`Full Track WAV files removed: ${summary.fullTrackWav}`);
    console.log(`Full Track FLAC files removed: ${summary.fullTrackFlac}`);
    console.log(`Stem WAV files removed: ${summary.stemWav}`);
    console.log(`Stem FLAC files removed: ${summary.stemFlac}`);
    console.log("---------------");
    console.log(`Total files removed: ${totalFiles}`);

    if (summary.failures.length > 0) {
      console.log("\nFailures:");
      console.log("---------------");
      for (const failure of summary.failures) {
        console.error(
          `Failed to clean up ${failure.type} file (${failure.fileUrl}) for entity ${failure.entityId}:`,
          failure.error
        );
      }
      console.log(`Total failures: ${summary.failures.length}`);
    }

    // If there are more tracks to process, queue another job
    if (hasMoreTracks) {
      const delayMinutes = 1;
      console.log(
        `More tracks to process, queueing next batch with a ${delayMinutes} minute delay (using same timeframe threshold)...`
      );
      await fileCleanupQueue.add(
        "scheduled-cleanup",
        job.data, // Reuse the exact same job data to maintain consistency
        {
          ...standardJobOptions,
          // Note, this means the next job will run a minute after the previous one but with
          // the same relative time threshold, so more tracks may fall within the threshold\
          // on the next run. This should be OK in real-world usage with a threshold measured
          // in days.
          delay: delayMinutes * 60000,
        }
      );
    }

    // If there were any failures, throw an error but include the summary
    if (summary.failures.length > 0) {
      throw new FileCleanupError(
        `Cleanup completed with ${summary.failures.length} failures. Successfully removed ${totalFiles} files.`
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
