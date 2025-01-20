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
  id: string;
}

export function encodeCursor(
  sortValue: Date | string | number,
  id: string
): string {
  return Buffer.from(`${sortValue.toString()}_${id}`).toString("base64");
}

export function decodeCursor(cursor: string): SortedCursor {
  const [sortValue, id] = Buffer.from(cursor, "base64").toString().split("_");
  return {
    sortValue: isNaN(Date.parse(sortValue)) ? sortValue : new Date(sortValue),
    id,
  };
}
