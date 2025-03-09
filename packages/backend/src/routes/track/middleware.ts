import { Request, Response, NextFunction, RequestHandler } from "express";
import { AppError } from "../../middleware/errorHandler";
import { verifyToken } from "../../services/auth";
import { TrackStatus } from "@wavtopia/core-storage";
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
        const decoded = verifyToken(token);

        // Check if user has access to track
        const hasAccess =
          track.isPublic ||
          track.userId === decoded.userId ||
          track.sharedWith.some((share) => share.userId === decoded.userId);

        if (!hasAccess) {
          return next(new AppError(403, "You don't have access to this track"));
        }

        req.user = {
          id: decoded.userId,
          role: decoded.role,
        };
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
