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
      console.log(
        `Processing track ${track.id} - Deleting files and cleaning up metadata`
      );

      await prisma.$transaction(async (tx) => {
        // Delete all associated files for the track
        console.log(
          `Deleting files for track ${track.id} and its ${track.stems.length} stems`
        );
        const trackFailures = await deleteTrackFiles(track);
        if (trackFailures.length > 0) {
          failures.push({ trackId: track.id, failures: trackFailures });
          console.log(
            `Skipping metadata cleanup for track ${track.id} due to file deletion failures`
          );
          return; // Skip metadata cleanup if any files failed
        }

        // Delete organizational metadata sequentially
        console.log(`Cleaning up metadata for track ${track.id}`);

        const shares = await tx.trackShare.deleteMany({
          where: { trackId: track.id },
        });
        const genres = await tx.trackGenre.deleteMany({
          where: { trackId: track.id },
        });
        const albums = await tx.trackAlbum.deleteMany({
          where: { trackId: track.id },
        });
        const credits = await tx.trackCredit.deleteMany({
          where: { trackId: track.id },
        });
        const moods = await tx.trackMood.deleteMany({
          where: { trackId: track.id },
        });
        const tags = await tx.trackTag.deleteMany({
          where: { trackId: track.id },
        });

        console.log(`Metadata cleanup results for track ${track.id}:`, {
          shares: shares.count,
          genres: genres.count,
          albums: albums.count,
          credits: credits.count,
          moods: moods.count,
          tags: tags.count,
        });

        // Mark track as deleted rather than removing the record
        console.log(`Marking track ${track.id} as deleted`);
        await tx.track.update({
          where: { id: track.id },
          data: {
            status: "DELETED",
            deletedAt: new Date(),
          },
        });

        // Note that user storage has been preemptively updated when the track was marked for deletion,
        // so we don't need to do anything about it here.
      });

      console.log(
        `Successfully completed deletion process for track ${track.id}`
      );
    }

    if (failures.length > 0) {
      console.error(
        `File deletion failures occurred for ${failures.length} tracks:`,
        failures.map((f) => ({
          trackId: f.trackId,
          failedFiles: f.failures.map((fail) => fail.fileUrl),
          errors: f.failures.map((fail) => fail.error.message),
        }))
      );
      // We could potentially:
      // 1. Retry the failed deletions
      // 2. Move failed tracks to a "failed_deletion" status
      // 3. Create a cleanup job for later
      // For now, we'll just log the failures
    }

    console.log(
      `Track deletion job ${job.id} completed. Processed ${tracks.length} tracks with ${failures.length} failures`
    );
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
