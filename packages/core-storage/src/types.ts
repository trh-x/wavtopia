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

export function encodeCursor(date: Date, id: string): string {
  return Buffer.from(`${date.toISOString()}_${id}`).toString("base64");
}

export function decodeCursor(cursor: string): { date: Date; id: string } {
  const [dateStr, id] = Buffer.from(cursor, "base64").toString().split("_");
  return {
    date: new Date(dateStr),
    id,
  };
}
