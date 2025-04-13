import { Job, Worker } from "bullmq";
import { config } from "@wavtopia/core-storage";
import { deleteTrackFiles } from "../track-deletion";
import {
  createQueue,
  prisma,
  setupQueueMonitoring,
  standardJobOptions,
} from "./common";

interface TrackDeletionJob {
  trackIds: string[];
}

// Create queue
export const trackDeletionQueue =
  createQueue<TrackDeletionJob>("track-deletion");

// Set up monitoring
setupQueueMonitoring(trackDeletionQueue, "Track Deletion");

async function trackDeletionProcessor(job: Job<TrackDeletionJob>) {
  console.log(
    `Processing track deletion job ${
      job.id
    } for tracks: ${job.data.trackIds.join(", ")}`
  );

  try {
    const { trackIds } = job.data;

    // Find all tracks to delete
    const tracks = await prisma.track.findMany({
      where: {
        id: { in: trackIds },
        status: "PENDING_DELETION", // Only delete tracks that are still pending deletion
      },
      include: { stems: true },
    });

    if (tracks.length === 0) {
      console.log(
        "No tracks found for deletion, they may have already been deleted"
      );
      return;
    }

    const failures: {
      trackId: string;
      failures: { fileUrl: string; error: Error }[];
    }[] = [];

    // Process tracks sequentially to maintain file deletion concurrency limits
    for (const track of tracks) {
      console.log(`Processing track ${track.id}`);

      await prisma.$transaction(async (tx) => {
        // Delete all associated files for the track
        const trackFailures = await deleteTrackFiles(track);
        if (trackFailures.length > 0) {
          failures.push({ trackId: track.id, failures: trackFailures });
          return; // Skip stem/track deletion if any files failed
        }

        // Delete stems and track only if all files were deleted successfully
        await tx.stem.deleteMany({
          where: { trackId: track.id },
        });

        await tx.track.delete({
          where: { id: track.id },
        });

        // Note that user storage has be preemptively updated when the track was marked for deletion,
        // so we don't need to do anything about it here.
      });

      console.log(`Completed processing track ${track.id}`);
    }

    if (failures.length > 0) {
      console.error("Some files failed to delete:", failures);
      // We could potentially:
      // 1. Retry the failed deletions
      // 2. Move failed tracks to a "failed_deletion" status
      // 3. Create a cleanup job for later
      // For now, we'll just log the failures
    }

    console.log("Track deletion completed successfully");
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
    throw error;
  }
}

// Process track deletion jobs
export const worker = new Worker<TrackDeletionJob>(
  "track-deletion",
  trackDeletionProcessor,
  {
    connection: config.redis,
  }
);

// Cleanup function for graceful shutdown
export async function cleanup(): Promise<void> {
  await worker.close();
}

// Add job to queue
export async function queueTrackDeletion(trackIds: string[]) {
  // Then add to queue
  const job = await trackDeletionQueue.add(
    "delete-tracks",
    { trackIds },
    standardJobOptions
  );

  return job.id;
}
