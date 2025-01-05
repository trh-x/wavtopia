import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";

const prisma = new PrismaClient();
const router = Router();

// Get public tracks
router.get("/public", async (req: Request, res: Response) => {
  const publicTracks = await prisma.track.findMany({
    where: {
      isPublic: true,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  res.json(publicTracks);
});

// Apply authentication middleware for all other routes
router.use(authenticate);

// Get all tracks
router.get("/", async (req, res, next) => {
  try {
    const tracks = await prisma.track.findMany({
      where: {
        userId: req.user!.id, // Only get user's own tracks
      },
      include: {
        components: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
    res.json(tracks);
  } catch (error) {
    next(error);
  }
});

// Get tracks shared with the current user
router.get("/shared", async (req: Request, res: Response, next) => {
  try {
    const sharedTracks = await prisma.track.findMany({
      where: {
        sharedWith: {
          some: {
            userId: req.user!.id,
          },
        },
      },
      include: {
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
    });
    res.json(sharedTracks);
  } catch (error) {
    next(error);
  }
});

export { router as tracksRoutes };
