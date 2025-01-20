import { Prisma } from ".prisma/client";
export type Track = Prisma.TrackGetPayload<{
    include: {
        user: {
            select: {
                id: true;
                username: true;
                email: true;
            };
        };
        components: true;
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
