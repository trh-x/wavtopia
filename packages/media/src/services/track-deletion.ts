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
