import { Prisma } from ".prisma/client";
export type Stem = Prisma.StemGetPayload<{}>;
export type Track = Prisma.TrackGetPayload<{
    include: {
        user: {
            select: {
                id: true;
                username: true;
                email: true;
            };
        };
        stems: true;
        sharedWith: {
            include: {
                user: {
                    select: {
                        id: true;
                        username: true;
                        email: true;
                    };
                };
            };
        };
    };
}>;
export type TrackShare = Prisma.TrackShareGetPayload<{
    include: {
        user: true;
    };
}>;
export type Genre = Prisma.GenreGetPayload<{}>;
export interface PaginatedResponse<T> {
    items: T[];
    metadata: {
        hasNextPage: boolean;
        nextCursor?: string;
    };
}
export interface PaginationParams {
    cursor?: string;
    limit?: number;
}
export interface SortedCursor {
    sortValue: string | number | Date;
    createdAt: Date;
}
export declare function encodeCursor(sortValue: Date | string | number, id: string, createdAt: Date): string;
export declare function decodeCursor(cursor: string): SortedCursor & {
    id: string;
};
export type TrackUsageResponse = Prisma.TrackEventGetPayload<{
    select: {
        id: true;
        trackId: true;
        stemId: true;
        userId: true;
        eventType: true;
        playbackSource: true;
        duration: true;
        format: true;
        createdAt: true;
    };
}>;
