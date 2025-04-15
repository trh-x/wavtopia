/**
 * Example functions for filtering tracks using denormalized arrays
 */
interface TrackFilterOptions {
    searchTerm?: string;
    genres?: string[];
    moods?: string[];
    artists?: string[];
    tags?: string[];
    bpmMin?: number;
    bpmMax?: number;
    key?: string;
    isExplicit?: boolean;
    releaseDateStart?: Date;
    releaseDateEnd?: Date;
    limit?: number;
    offset?: number;
}
/**
 * Filter tracks using Prisma's query API
 * This approach works well for simple filters
 */
export declare function filterTracks(options: TrackFilterOptions): Promise<{
    tracks: ({
        user: {
            username: string;
            id: string;
        };
    } & {
        status: import(".prisma/client").$Enums.TrackStatus;
        userId: string;
        title: string;
        metadata: import(".prisma/client/runtime/library").JsonValue | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        waveformData: number[];
        duration: number | null;
        wavConversionStatus: import(".prisma/client").$Enums.AudioFileConversionStatus;
        flacConversionStatus: import(".prisma/client").$Enums.AudioFileConversionStatus;
        wavCreatedAt: Date | null;
        wavLastRequestedAt: Date | null;
        flacCreatedAt: Date | null;
        flacLastRequestedAt: Date | null;
        totalPlays: number;
        totalDownloads: number;
        uniqueListeners: number;
        lastPlayedAt: Date | null;
        mp3SizeBytes: number | null;
        wavSizeBytes: number | null;
        flacSizeBytes: number | null;
        primaryArtistId: string;
        primaryArtistName: string | null;
        originalFormat: import(".prisma/client").$Enums.SourceFormat;
        originalUrl: string;
        fullTrackWavUrl: string | null;
        fullTrackMp3Url: string | null;
        fullTrackFlacUrl: string | null;
        coverArt: string | null;
        isPublic: boolean;
        deletedAt: Date | null;
        originalSizeBytes: number | null;
        coverArtSizeBytes: number | null;
        bpm: number | null;
        key: string | null;
        isrc: string | null;
        language: string | null;
        isExplicit: boolean;
        releaseDate: Date | null;
        releaseDatePrecision: import(".prisma/client").$Enums.DatePrecision | null;
        originalReleaseDate: Date | null;
        originalReleaseDatePrecision: import(".prisma/client").$Enums.DatePrecision | null;
        catalogNumber: string | null;
        copyright: string | null;
        pLine: string | null;
        cLine: string | null;
        lyrics: string | null;
        description: string | null;
        version: string | null;
        remixedBy: string | null;
        replayGain: number | null;
        peakAmplitude: number | null;
        encodingTechnology: string | null;
        recordingLocation: string | null;
        recordLabelId: string | null;
        licenseId: string | null;
        licenseType: import(".prisma/client").$Enums.LicenseType | null;
        genreNames: string[];
        moodNames: string[];
        tagNames: string[];
        artistNames: string[];
        searchConfigHash: string | null;
    })[];
    total: number;
}>;
/**
 * Filter tracks using raw SQL for full-text search combined with array filtering
 * This approach is more efficient for complex filters and full-text search
 */
export declare function searchTracks(options: TrackFilterOptions): Promise<{
    tracks: unknown;
    total: number;
}>;
/**
 * Get available filter options (genres, moods, etc.)
 * This helps populate filter UI components
 */
export declare function getFilterOptions(): Promise<{
    genres: string[];
    moods: string[];
    tags: string[];
    artists: string[];
}>;
export {};
