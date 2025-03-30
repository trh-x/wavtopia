import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { z } from "zod";
import { AppError } from "../../middleware/errorHandler";
import { authenticateTrackAccess } from "./middleware";
import {
  TrackEventType,
  PlaybackSource,
  AudioFormat,
  Prisma,
} from "@wavtopia/core-storage";

const router = Router();

// Schema for track/stem usage data
const usageSchema = z.object({
  eventType: z.nativeEnum(TrackEventType),
  format: z.nativeEnum(AudioFormat).optional(),
  playbackSource: z.nativeEnum(PlaybackSource).optional(),
  duration: z.number().optional(),
});

type UsageInput = z.infer<typeof usageSchema>;

// Helper function to create activity data based on usage data
function createActivityData(usageData: UsageInput, now: Date) {
  return {
    firstPlayedAt: now,
    lastPlayedAt: now,
    playCount: usageData.eventType === TrackEventType.PLAY ? 1 : 0,
    streamCount:
      usageData.eventType === TrackEventType.PLAY &&
      usageData.playbackSource === PlaybackSource.STREAM
        ? 1
        : 0,
    localPlayCount:
      usageData.eventType === TrackEventType.PLAY &&
      usageData.playbackSource === PlaybackSource.SYNCED
        ? 1
        : 0,
    totalPlayTime: usageData.duration || 0,
    downloadCount: usageData.eventType === TrackEventType.DOWNLOAD ? 1 : 0,
    downloadFormats:
      usageData.eventType === TrackEventType.DOWNLOAD && usageData.format
        ? [usageData.format]
        : [],
  };
}

// Helper function to create activity update data based on usage data
function createActivityUpdateData(usageData: UsageInput, now: Date) {
  return {
    lastPlayedAt: now,
    playCount:
      usageData.eventType === TrackEventType.PLAY
        ? { increment: 1 }
        : undefined,
    streamCount:
      usageData.eventType === TrackEventType.PLAY &&
      usageData.playbackSource === PlaybackSource.STREAM
        ? { increment: 1 }
        : undefined,
    localPlayCount:
      usageData.eventType === TrackEventType.PLAY &&
      usageData.playbackSource === PlaybackSource.SYNCED
        ? { increment: 1 }
        : undefined,
    totalPlayTime: usageData.duration
      ? { increment: usageData.duration }
      : undefined,
    downloadCount:
      usageData.eventType === TrackEventType.DOWNLOAD
        ? { increment: 1 }
        : undefined,
    downloadFormats:
      usageData.eventType === TrackEventType.DOWNLOAD && usageData.format
        ? { push: usageData.format }
        : undefined,
  };
}

// Record track usage
router.post(
  "/:trackId/usage",
  authenticateTrackAccess,
  async (req, res, next) => {
    try {
      const { trackId } = req.params;
      const usageData = usageSchema.parse(req.body);
      const userId = req.user?.id;

      // Create the event
      const event = await prisma.trackEvent.create({
        data: {
          trackId,
          userId,
          eventType: usageData.eventType,
          format: usageData.format,
          playbackSource: usageData.playbackSource,
          duration: usageData.duration,
        },
      });

      // If there's a user, update or create their activity record
      if (userId) {
        const now = new Date();
        await prisma.userTrackActivity.upsert({
          where: {
            userId_trackId: {
              userId,
              trackId,
            },
          },
          create: {
            userId,
            trackId,
            ...createActivityData(usageData, now),
          },
          update: createActivityUpdateData(usageData, now),
        });
      }

      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, "Invalid usage data"));
      } else {
        next(error);
      }
    }
  }
);

// Record stem usage
router.post(
  "/:trackId/stem/:stemId/usage",
  authenticateTrackAccess,
  async (req, res, next) => {
    try {
      const { trackId, stemId } = req.params;
      const usageData = usageSchema.parse(req.body);
      const userId = req.user?.id;

      // Verify stem belongs to track
      const stem = await prisma.stem.findUnique({
        where: {
          id: stemId,
          trackId: trackId,
        },
      });

      if (!stem) {
        return next(
          new AppError(404, "Stem not found or does not belong to track")
        );
      }

      // Create the event
      const event = await prisma.stemEvent.create({
        data: {
          stemId,
          userId,
          eventType: usageData.eventType,
          format: usageData.format,
          playbackSource: usageData.playbackSource,
          duration: usageData.duration,
        },
      });

      // If there's a user, update or create their activity record
      if (userId) {
        const now = new Date();
        await prisma.userStemActivity.upsert({
          where: {
            userId_stemId: {
              userId,
              stemId,
            },
          },
          create: {
            userId,
            stemId,
            ...createActivityData(usageData, now),
          },
          update: createActivityUpdateData(usageData, now),
        });
      }

      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, "Invalid usage data"));
      } else {
        next(error);
      }
    }
  }
);

export { router as trackUsageRoutes };
