import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import {
  PaginatedResponse,
  PaginationParams,
  encodeCursor,
  decodeCursor,
  Prisma,
} from "@wavtopia/core-storage";

const router = Router();
const DEFAULT_PAGE_SIZE = 6;

// Helper function to handle cursor-based pagination
async function getPaginatedTracks<I extends Prisma.TrackInclude>(
  where: Prisma.TrackWhereInput,
  include: I,
  params: PaginationParams
): Promise<PaginatedResponse<Prisma.TrackGetPayload<{ include: I }>>> {
  const limit = params.limit || DEFAULT_PAGE_SIZE;
  const cursor = params.cursor ? decodeCursor(params.cursor) : null;

  // Get one extra item to determine if there's a next page
  const items = await prisma.track.findMany({
    where: cursor
      ? {
          ...where,
          OR: [
            {
              createdAt: { lt: cursor.date },
            },
            {
              createdAt: cursor.date,
              id: { lt: cursor.id },
            },
          ],
        }
      : where,
    include,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }], // TODO: This is a temporarily change to FIFO sort, to be reverted
    take: limit + 1,
  });

  const hasNextPage = items.length > limit;
  const paginatedItems = hasNextPage ? items.slice(0, -1) : items;

  return {
    items: paginatedItems,
    metadata: {
      hasNextPage,
      nextCursor: hasNextPage
        ? encodeCursor(
            paginatedItems[paginatedItems.length - 1].createdAt,
            paginatedItems[paginatedItems.length - 1].id
          )
        : undefined,
    },
  };
}

// Get public tracks
router.get("/public", async (req: Request, res: Response) => {
  const cursor = req.query.cursor as string | undefined;
  const limit = req.query.limit
    ? parseInt(req.query.limit as string)
    : undefined;

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
    { cursor, limit }
  );

  res.json(result);
});

// Apply authentication middleware for all other routes
router.use(authenticate);

// Get all tracks owned by the current user
router.get("/", async (req, res, next) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string)
      : undefined;

    const result = await getPaginatedTracks(
      { userId: req.user!.id },
      {
        components: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      { cursor, limit }
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get tracks shared with the current user
router.get("/shared", async (req: Request, res: Response, next) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string)
      : undefined;

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
      { cursor, limit }
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get all tracks accessible to the current user
router.get("/available", async (req: Request, res: Response, next) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string)
      : undefined;

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
      { cursor, limit }
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export { router as tracksRoutes };
