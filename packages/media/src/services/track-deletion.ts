import { DeletionFailure, processBatchedDeletions } from "./storage/deletion";

/**
 * Delete all files associated with a track
 */
export async function deleteTrackFiles(track: {
  originalUrl: string | null;
  fullTrackWavUrl?: string | null;
  fullTrackMp3Url?: string | null;
  fullTrackFlacUrl?: string | null;
  coverArt?: string | null;
  stems: {
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

  const stemFiles = track.stems.flatMap((stem) => [
    stem.wavUrl,
    stem.mp3Url,
    stem.flacUrl,
  ]);

  // Process all files in batches and return any failures
  return processBatchedDeletions([...trackFiles, ...stemFiles]);
}
