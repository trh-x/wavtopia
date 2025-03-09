import { Prisma } from ".prisma/client";

// Base Stem type - matches what Prisma gives us in track.stems
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
  // Note: id is not part of the sort key but is included in the encoded cursor
  // for record identification and cursor validation
}

// TODO: Move these functions out of types.ts
export function encodeCursor(
  sortValue: Date | string | number,
  id: string,
  createdAt: Date
): string {
  let type = "s"; // string
  let value = sortValue.toString();

  if (sortValue instanceof Date) {
    type = "d"; // date
    value = sortValue.getTime().toString();
  } else if (typeof sortValue === "number") {
    type = "n"; // number
  }

  // We include the id in the cursor string (after the _) for three reasons:
  // 1. Record identification - helps identify exactly which record was last in the previous page
  // 2. Cursor validation - allows verifying the cursor points to a record that existed
  // 3. Future proofing - maintains flexibility to change cursor behavior without changing format
  return Buffer.from(`${type}:${value}:${createdAt.getTime()}_${id}`).toString(
    "base64"
  );
}

// decodeCursor returns both the sort-related fields (in SortedCursor) and the id
// The id isn't used for ordering but is available for record identification
export function decodeCursor(cursor: string): SortedCursor & { id: string } {
  const [encoded, id] = Buffer.from(cursor, "base64").toString().split("_");
  const [type, value, createdAtMs] = encoded.split(":");

  const createdAt = new Date(Number(createdAtMs));

  switch (type) {
    case "d":
      return { sortValue: new Date(Number(value)), id, createdAt };
    case "n":
      return { sortValue: Number(value), id, createdAt };
    default:
      return { sortValue: value, id, createdAt };
  }
}
