// Enums from schema
export enum AudioFormat {
  ORIGINAL = "ORIGINAL",
  WAV = "WAV",
  MP3 = "MP3",
  FLAC = "FLAC",
}

export enum PlaybackSource {
  STREAM = "STREAM",
  SYNCED = "SYNCED",
}

export interface Options {
  respectExisting: boolean; // Skip items that already have stats
}

export interface EngagementStats {
  plays: number;
  downloads: number;
}
