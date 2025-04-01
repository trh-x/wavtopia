export declare enum AudioFormat {
    ORIGINAL = "ORIGINAL",
    WAV = "WAV",
    MP3 = "MP3",
    FLAC = "FLAC"
}
export declare enum PlaybackSource {
    STREAM = "STREAM",
    SYNCED = "SYNCED"
}
export interface Options {
    respectExisting: boolean;
}
export interface EngagementStats {
    plays: number;
    downloads: number;
}
