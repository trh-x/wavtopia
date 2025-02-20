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
      include: { components: true },
    });

    if (tracks.length === 0) {
      console.log(
        "No tracks found for deletion, they may have already been deleted"
      );
      return;
    }

    // Process tracks in batches to avoid overwhelming the system
    const BATCH_SIZE = 5;
    const failures: {
      trackId: string;
      failures: { fileUrl: string; error: Error }[];
    }[] = [];

    for (let i = 0; i < tracks.length; i += BATCH_SIZE) {
      const batch = tracks.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${i / BATCH_SIZE + 1}`);

      await prisma.$transaction(async (tx) => {
        // Delete all associated files for each track in the batch
        const deletionResults = await Promise.all(
          batch.map(async (track) => {
            const trackFailures = await deleteTrackFiles(track);
            if (trackFailures.length > 0) {
              failures.push({ trackId: track.id, failures: trackFailures });
            }
            return trackFailures;
          })
        );

        // If any track had no failures, delete its components and the track itself
        const successfulTracks = batch.filter(
          (track, idx) => deletionResults[idx].length === 0
        );

        if (successfulTracks.length > 0) {
          // Delete all components for these tracks
          await tx.component.deleteMany({
            where: { trackId: { in: successfulTracks.map((t) => t.id) } },
          });

          // Then delete all tracks
          await tx.track.deleteMany({
            where: { id: { in: successfulTracks.map((t) => t.id) } },
          });
        }
      });

      console.log(`Completed batch ${i / BATCH_SIZE + 1}`);
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
