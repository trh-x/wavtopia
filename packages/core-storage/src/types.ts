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
  primary: string | number | Date;
  id: string;
}

export function encodeCursor(
  primary: Date | string | number,
  id: string
): string {
  return Buffer.from(`${primary.toString()}_${id}`).toString("base64");
}

export function decodeCursor(cursor: string): SortedCursor {
  const [primary, id] = Buffer.from(cursor, "base64").toString().split("_");
  return {
    primary: isNaN(Date.parse(primary)) ? primary : new Date(primary),
    id,
  };
}
