import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import {
  PaginatedResponse,
  PaginationParams,
  encodeCursor,
  decodeCursor,
  Prisma,
  TrackStatus,
  updateUserStorage,
} from "@wavtopia/core-storage";
import { AppError } from "../middleware/errorHandler";
import { z } from "zod";
import { config } from "../config";
import { Role } from "@wavtopia/core-storage";

const router = Router();
const DEFAULT_PAGE_SIZE = 24;

// Helper function to extract pagination and sorting parameters
function extractPaginationParams(req: Request) {
  const cursor = req.query.cursor as string | undefined;
  const limit = req.query.limit
    ? parseInt(req.query.limit as string)
    : undefined;
  const sortField = req.query.sortField as
    | "createdAt"
    | "title"
    | "duration"
    | "primaryArtistName"
    | undefined;
  const sortDirection = req.query.sortDirection as "asc" | "desc" | undefined;

  return { cursor, limit, sortField, sortDirection };
}

// Helper function to handle cursor-based pagination
async function getPaginatedTracks<I extends Prisma.TrackInclude>(
  where: Prisma.TrackWhereInput,
  include: I,
  params: PaginationParams & {
    sortField?: "createdAt" | "title" | "duration" | "primaryArtistName";
    sortDirection?: "asc" | "desc";
  }
): Promise<PaginatedResponse<Prisma.TrackGetPayload<{ include: I }>>> {
  const { sortField = "createdAt", sortDirection = "desc" } = params;
  const cursor = params.cursor ? decodeCursor(params.cursor) : null;

  const orderBy: Prisma.TrackOrderByWithRelationInput[] = [
    { [sortField]: sortDirection },
    // Use createdAt as stable secondary sort with millisecond precision
    { createdAt: sortDirection },
  ];

  const cursorCondition = cursor
    ? {
        OR: [
          {
            [sortField]:
              sortDirection === "desc"
                ? { lt: cursor.sortValue }
                : { gt: cursor.sortValue },
          },
          {
            [sortField]: cursor.sortValue,
            createdAt:
              sortDirection === "desc"
                ? { lt: cursor.createdAt }
                : { gt: cursor.createdAt },
          },
        ],
      }
    : {};

  const limit = params.limit || DEFAULT_PAGE_SIZE;

  const items = await prisma.track.findMany({
    where: {
      ...where,
      ...cursorCondition,
    },
    include,
    orderBy,
    take: limit + 1,
  });

  const hasNextPage = items.length > limit;
  const paginatedItems = hasNextPage ? items.slice(0, -1) : items;

  const lastItem = paginatedItems[paginatedItems.length - 1];
  const sortValue = lastItem?.[sortField];

  return {
    items: paginatedItems,
    metadata: {
      hasNextPage,
      nextCursor:
        hasNextPage && sortValue != null
          ? encodeCursor(sortValue, lastItem.id, lastItem.createdAt)
          : undefined,
    },
  };
}

// Get public tracks
router.get("/public", async (req: Request, res: Response) => {
  const params = extractPaginationParams(req);
  const result = await getPaginatedTracks(
    { isPublic: true, status: TrackStatus.ACTIVE },
    {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    params
  );

  res.json(result);
});

// Apply authentication middleware for all other routes
router.use(authenticate);

// Get all tracks owned by the current user
router.get("/", async (req, res, next) => {
  try {
    const params = extractPaginationParams(req);
    const result = await getPaginatedTracks(
      { userId: req.user!.id, status: TrackStatus.ACTIVE },
      {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      params
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get tracks shared with the current user
router.get("/shared", async (req: Request, res: Response, next) => {
  try {
    const params = extractPaginationParams(req);
    const result = await getPaginatedTracks(
      {
        sharedWith: {
          some: {
            userId: req.user!.id,
          },
        },
        status: TrackStatus.ACTIVE,
      },
      {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        stems: true,
        sharedWith: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
      params
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get all tracks accessible to the current user
router.get("/available", async (req: Request, res: Response, next) => {
  try {
    const params = extractPaginationParams(req);
    const result = await getPaginatedTracks(
      {
        OR: [
          { userId: req.user!.id },
          { isPublic: true },
          { sharedWith: { some: { userId: req.user!.id } } },
        ],
        status: TrackStatus.ACTIVE,
      },
      {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      params
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get deleted tracks (admin only)
router.get("/deleted", async (req: Request, res: Response, next) => {
  try {
    // Verify admin status
    if (req.user?.role !== Role.ADMIN) {
      throw new AppError(403, "Unauthorized");
    }

    const params = extractPaginationParams(req);

    // Allow filtering by deletion status
    const status = req.query.status as TrackStatus | undefined;
    const result = await getPaginatedTracks(
      {
        status: status || {
          in: [TrackStatus.DELETED, TrackStatus.PENDING_DELETION],
        },
      },
      {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      // TODO: Add a select arg to only return the needed fields
      params
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Schema for track deletion
const deleteTrackSchema = z.object({
  trackIds: z.array(z.string()).min(1),
});

// Delete one or more tracks
router.delete("/", async (req, res, next) => {
  try {
    const { trackIds } = deleteTrackSchema.parse(req.body);

    // Find all tracks and verify ownership/admin status
    const tracks = await prisma.track.findMany({
      where: {
        id: { in: trackIds },
        status: TrackStatus.ACTIVE,
      },
      select: {
        userId: true,
        originalSizeBytes: true,
        coverArtSizeBytes: true,
        mp3SizeBytes: true,
        // WAV and FLAC sizes are not needed as they aren't tracked for user's storage.
        stems: {
          select: {
            mp3SizeBytes: true,
          },
        },
      },
    });

    // Check if all tracks exist
    if (tracks.length !== trackIds.length) {
      throw new AppError(404, "One or more tracks not found");
    }

    // Check if user has permission to delete all tracks
    const isAdmin = req.user!.role === "ADMIN";
    if (!isAdmin && tracks.some((track) => track.userId !== req.user!.id)) {
      throw new AppError(
        403,
        "You don't have permission to delete one or more tracks"
      );
    }

    // Update tracks status to PENDING_DELETION
    await prisma.track.updateMany({
      where: { id: { in: trackIds } },
      data: { status: TrackStatus.PENDING_DELETION },
    });

    const bytesToSubtract = tracks.reduce((acc, track) => {
      return (
        acc +
        (track.originalSizeBytes ?? 0) +
        (track.coverArtSizeBytes ?? 0) +
        (track.mp3SizeBytes ?? 0) +
        track.stems.reduce((acc, stem) => {
          return acc + (stem.mp3SizeBytes ?? 0);
        }, 0)
      );
    }, 0);

    // Preemptively remove the track file sizes from the user's storage, although
    // the space won't actually be freed until the scheduled deletion job has run.
    updateUserStorage(
      {
        userId: req.user!.id,
        bytesChange: -bytesToSubtract,
      },
      prisma
    );

    const mediaServiceUrl = config.services.mediaServiceUrl;
    if (!mediaServiceUrl) {
      throw new AppError(500, "Media service URL not configured");
    }

    // Queue tracks for deletion via media service
    const response = await fetch(`${mediaServiceUrl}/api/media/tracks/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trackIds,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { error?: string };
      throw new AppError(
        response.status,
        error.error || "Failed to delete tracks"
      );
    }

    const data = await response.json();
    res.status(202).json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, "trackIds must be a non-empty array"));
    } else {
      next(error);
    }
  }
});

export { router as tracksRoutes };
