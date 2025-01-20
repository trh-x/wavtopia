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
  let type = "s"; // string
  let value = sortValue.toString();

  if (sortValue instanceof Date) {
    type = "d"; // date
    value = sortValue.getTime().toString();
  } else if (typeof sortValue === "number") {
    type = "n"; // number
    value = sortValue.toString();
  }

  return Buffer.from(`${type}:${value}_${id}`).toString("base64");
}

export function decodeCursor(cursor: string): SortedCursor {
  const [encoded, id] = Buffer.from(cursor, "base64").toString().split("_");
  const [type, value] = encoded.split(":");

  switch (type) {
    case "d":
      return { sortValue: new Date(Number(value)), id };
    case "n":
      return { sortValue: Number(value), id };
    default:
      return { sortValue: value, id };
  }
}
