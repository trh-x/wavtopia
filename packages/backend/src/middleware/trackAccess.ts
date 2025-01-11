import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "./errorHandler";
import { verifyToken } from "../services/auth";

export async function canAccessTrack(trackId: string, userId?: string) {
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: { sharedWith: true },
  });

  if (!track) return false;

  return (
    track.isPublic ||
    (userId &&
      (track.userId === userId ||
        track.sharedWith.some((share) => share.userId === userId)))
  );
}

// TODO: Remove this unused middleware. Maybe copy its "store track for later use" logic to the authenticateTrackAccess middleware.
export function requireTrackAccess(options: { allowPublic?: boolean } = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const trackId = req.params.id;
      if (!trackId) {
        throw new AppError(400, "Track ID is required");
      }

      const hasAccess = await canAccessTrack(trackId, req.user?.id);

      if (!hasAccess) {
        throw new AppError(404, "Track not found or access denied");
      }

      // Store the track in the request for later use
      const track = await prisma.track.findUnique({
        where: { id: trackId },
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

      if (!track) {
        throw new AppError(404, "Track not found");
      }

      // Only allow access to certain fields for public tracks when user is not authenticated
      if (track.isPublic && !req.user) {
        const publicTrack = {
          id: track.id,
          title: track.title,
          artist: track.artist,
          coverArt: track.coverArt,
          isPublic: track.isPublic,
          fullTrackUrl: track.fullTrackUrl,
          fullTrackMp3Url: track.fullTrackMp3Url,
          waveformData: track.waveformData,
          components: track.components,
          user: track.user,
          createdAt: track.createdAt,
          updatedAt: track.updatedAt,
        };
        (req as any).track = publicTrack;
      } else {
        (req as any).track = track;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
