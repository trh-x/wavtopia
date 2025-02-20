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
} from "@wavtopia/core-storage";

const router = Router();
const DEFAULT_PAGE_SIZE = 6;

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
    | "artist"
    | undefined;
  const sortDirection = req.query.sortDirection as "asc" | "desc" | undefined;

  return { cursor, limit, sortField, sortDirection };
}

// Helper function to handle cursor-based pagination
async function getPaginatedTracks<I extends Prisma.TrackInclude>(
  where: Prisma.TrackWhereInput,
  include: I,
  params: PaginationParams & {
    sortField?: "createdAt" | "title" | "duration" | "artist";
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
      status: TrackStatus.ACTIVE,
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
    { isPublic: true },
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
      { userId: req.user!.id },
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
      },
      {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        components: true,
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

export { router as tracksRoutes };
