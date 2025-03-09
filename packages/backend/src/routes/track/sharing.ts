import { Router, Request, Response } from "express";
import { AppError } from "../../middleware/errorHandler";
import { authenticate } from "../../middleware/auth";
import { z } from "zod";
import { TrackStatus } from "@wavtopia/core-storage";
import { prisma } from "../../lib/prisma";

// TODO: Extend Request type to include user property

const router = Router();

// Schema for track sharing
const shareTrackSchema = z.object({
  userIds: z.array(z.string()),
});

// Apply authentication middleware for all other routes
router.use(authenticate);

// Share a track with other users
router.post("/:id/share", async (req: Request, res: Response, next) => {
  try {
    const { userIds } = shareTrackSchema.parse(req.body);

    // Verify track ownership
    const track = await prisma.track.findUnique({
      where: {
        id: req.params.id,
        userId: req.user!.id,
        status: TrackStatus.ACTIVE,
      },
    });

    if (!track) {
      throw new AppError(404, "Track not found or you don't have permission");
    }

    // Create share records
    const shares = await prisma.$transaction(
      userIds.map((userId) =>
        prisma.trackShare.create({
          data: {
            trackId: track.id,
            userId,
          },
        })
      )
    );

    res.json({ message: "Track shared successfully", shares });
  } catch (error) {
    next(error);
  }
});

// Remove track sharing for specific users
router.delete("/:id/share", async (req: Request, res: Response, next) => {
  try {
    const { userIds } = shareTrackSchema.parse(req.body);

    // Verify track ownership
    const track = await prisma.track.findUnique({
      where: {
        id: req.params.id,
        userId: req.user!.id,
        status: TrackStatus.ACTIVE,
      },
    });

    if (!track) {
      throw new AppError(404, "Track not found or you don't have permission");
    }

    // Remove share records
    await prisma.trackShare.deleteMany({
      where: {
        trackId: track.id,
        userId: {
          in: userIds,
        },
      },
    });

    res.json({ message: "Track sharing removed successfully" });
  } catch (error) {
    next(error);
  }
});

// Update track visibility
router.patch("/:id/visibility", async (req: Request, res: Response, next) => {
  try {
    const { isPublic } = z.object({ isPublic: z.boolean() }).parse(req.body);

    // First check if the track exists and belongs to the user
    const existingTrack = await prisma.track.findFirst({
      where: {
        id: req.params.id,
        status: TrackStatus.ACTIVE,
        OR: [
          { userId: req.user!.id },
          { sharedWith: { some: { userId: req.user!.id } } },
          { isPublic: true },
        ],
      },
    });

    if (!existingTrack) {
      throw new AppError(404, "Track not found or you don't have permission");
    }

    // Only allow the owner to change visibility
    if (existingTrack.userId !== req.user!.id) {
      throw new AppError(
        403,
        "Only the track owner can change visibility settings"
      );
    }

    // Then update the track
    const track = await prisma.track.update({
      where: {
        id: req.params.id,
      },
      data: {
        isPublic,
      },
    });

    res.json(track);
  } catch (error) {
    next(error);
  }
});

export { router as trackSharingRoutes };
