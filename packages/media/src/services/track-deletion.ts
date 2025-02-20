import { deleteFile } from "./storage";

interface DeletionFailure {
  fileUrl: string;
  error: Error;
}

/**
 * Helper function to delete a file if it exists
 */
async function deleteFileIfExists(
  url: string | null | undefined
): Promise<DeletionFailure | null> {
  if (!url) return null;

  try {
    await deleteFile(url);
    return null;
  } catch (error) {
    return {
      fileUrl: url,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Process deletions in batches to limit concurrent requests
 */
async function processBatchedDeletions(
  urls: (string | null | undefined)[],
  batchSize: number = 3
): Promise<DeletionFailure[]> {
  const failures: DeletionFailure[] = [];

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(deleteFileIfExists));

    // Collect failures from this batch
    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value) {
        failures.push(result.value);
      } else if (result.status === "rejected") {
        // This shouldn't happen since deleteFileIfExists catches errors, but handle it just in case
        failures.push({
          fileUrl: "unknown",
          error:
            result.reason instanceof Error
              ? result.reason
              : new Error(String(result.reason)),
        });
      }
    });
  }

  return failures;
}

/**
 * Delete all files associated with a track
 */
export async function deleteTrackFiles(track: {
  originalUrl: string | null;
  fullTrackWavUrl?: string | null;
  fullTrackMp3Url?: string | null;
  fullTrackFlacUrl?: string | null;
  coverArt?: string | null;
  components: {
    flacUrl: string | null;
    wavUrl: string | null;
    mp3Url: string | null;
  }[];
}): Promise<DeletionFailure[]> {
  // Collect all files to delete
  const trackFiles = [
    track.originalUrl,
    track.fullTrackWavUrl,
    track.fullTrackMp3Url,
    track.fullTrackFlacUrl,
    track.coverArt,
  ];

  const componentFiles = track.components.flatMap((component) => [
    component.wavUrl,
    component.mp3Url,
    component.flacUrl,
  ]);

  // Process all files in batches and return any failures
  return processBatchedDeletions([...trackFiles, ...componentFiles]);
}
