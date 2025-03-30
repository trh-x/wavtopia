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
  config,
} from "@wavtopia/core-storage";
import { NextFunction } from "express";
import { redis } from "../../lib/redis";

const router = Router();

// Rate limiting constants
const PLAY_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

// Helper function to check rate limit
async function checkRateLimit(identifier: string): Promise<boolean> {
  const now = Date.now();
  const key = `rate_limit:${identifier}`;

  // Use Redis SETNX (SET if Not eXists) for atomic check-and-set
  const result = await redis.set(key, now, "PX", PLAY_COOLDOWN_MS, "NX");

  // If we successfully set the key (it didn't exist), allow the request
  return result === "OK";
}

interface RateLimitIdParams {
  userId: string | undefined;
  ip: string;
  resourceId: string;
}

// Helper function to get rate limit identifier
function getRateLimitId({ userId, ip, resourceId }: RateLimitIdParams): string {
  // For anonymous users, use IP-based identifier
  if (!userId) {
    return `anon:${ip}:${resourceId}`;
  }
  // For authenticated users, use user ID-based identifier
  return `user:${userId}:${resourceId}`;
}

// Schema for track/stem usage data
const usageSchema = z.object({
  eventType: z.nativeEnum(TrackEventType),
  format: z.nativeEnum(AudioFormat).optional(),
  playbackSource: z.nativeEnum(PlaybackSource).optional(),
  duration: z.number().optional(),
});

type UsageInput = z.infer<typeof usageSchema>;

// Helper function to create activity data based on usage data
function createActivityData(
  usageData: UsageInput,
  now: Date
): Omit<Prisma.UserTrackActivityUncheckedCreateInput, "userId" | "trackId"> {
  return {
    firstPlayedAt: now,
    lastPlayedAt: now,
    playCount: usageData.eventType === TrackEventType.PLAY ? 1 : 0,
    streamCount:
      usageData.eventType === TrackEventType.PLAY &&
      usageData.playbackSource === PlaybackSource.STREAM
        ? 1
        : 0,
    syncedPlayCount:
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
function createActivityUpdateData(
  usageData: UsageInput,
  now: Date
): Prisma.UserTrackActivityUpdateInput {
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
    syncedPlayCount:
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

async function checkPlayRateLimit(
  userId: string | undefined,
  clientIp: string,
  resourceId: string,
  next: NextFunction
): Promise<boolean> {
  const rateLimitId = getRateLimitId({ userId, ip: clientIp, resourceId });
  if (!(await checkRateLimit(rateLimitId))) {
    next(new AppError(429, "Rate limit exceeded. Please try again later."));
    return false;
  }
  return true;
}

// Record track usage
router.post("/:id/usage", authenticateTrackAccess, async (req, res, next) => {
  try {
    const { id } = req.params;
    const usageData = usageSchema.parse(req.body);
    const userId = req.user?.id;
    const clientIp = req.ip || "unknown";

    // Only apply rate limiting for play events
    if (usageData.eventType === TrackEventType.PLAY) {
      const resourceId = `track:${id}`;
      if (!(await checkPlayRateLimit(userId, clientIp, resourceId, next))) {
        return;
      }
    }

    // Create the event
    const event = await prisma.trackEvent.create({
      data: {
        trackId: id,
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
            trackId: id,
          },
        },
        create: {
          userId,
          trackId: id,
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
});

// Record stem usage
router.post(
  "/:id/stem/:stemId/usage",
  authenticateTrackAccess,
  async (req, res, next) => {
    try {
      const { id, stemId } = req.params;
      const usageData = usageSchema.parse(req.body);
      const userId = req.user?.id;
      const clientIp = req.ip || "unknown";

      // Only apply rate limiting for play events
      if (usageData.eventType === TrackEventType.PLAY) {
        const resourceId = `track:${id}:stem:${stemId}`;
        if (!(await checkPlayRateLimit(userId, clientIp, resourceId, next))) {
          return;
        }
      }

      // Verify stem belongs to track
      const stem = await prisma.stem.findUnique({
        where: {
          id: stemId,
          trackId: id,
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
