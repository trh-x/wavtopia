import { Request, Response, NextFunction, RequestHandler } from "express";
import { AppError } from "../../middleware/errorHandler";
import { getUserById, verifyToken } from "../../services/auth";
import { Role, TrackStatus } from "@wavtopia/core-storage";
import { prisma } from "../../lib/prisma";

// Authentication helper that checks both header and query token
export const authenticateTrackAccess: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get track ID from URL path
    const trackId = req.params.id;
    if (!trackId) {
      return next(new AppError(400, "Track ID is required"));
    }

    console.log("Authenticating track access for track:", trackId);

    // Fetch track with all fields but minimal relations
    const track = await prisma.track.findUnique({
      where: {
        id: trackId,
        status: TrackStatus.ACTIVE,
      },
      include: {
        sharedWith: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!track) {
      return next(new AppError(404, "Track not found"));
    }

    const token =
      (req.query.token as string) || req.headers.authorization?.split(" ")[1];

    if (!track.isPublic && !token) {
      return next(new AppError(401, "No token provided"));
    }

    if (token) {
      try {
        const payload = verifyToken(token);

        const user = await getUserById(payload.userId);
        if (!user) {
          return next(new AppError(401, "User not found"));
        }

        // Check if user has access to track
        const hasAccess =
          track.isPublic ||
          user.role === Role.ADMIN ||
          track.userId === user.id ||
          track.sharedWith.some((share) => share.userId === user.id);

        if (!hasAccess) {
          return next(new AppError(403, "You don't have access to this track"));
        }

        req.user = user;
      } catch (error) {
        return next(
          new AppError(401, "Invalid token: " + error + ", " + token)
        );
      }
    }

    // Store the track in the request for later use
    if (track.isPublic && !req.user) {
      const { sharedWith, ...publicTrack } = track;
      (req as any).track = publicTrack; // TODO: Fix this `any`
    } else {
      (req as any).track = track; // TODO: Fix this `any`
    }

    next();
  } catch (error) {
    next(error);
  }
};
