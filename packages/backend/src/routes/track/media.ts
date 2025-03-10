import { Router, Request, Response } from "express";
import { AppError } from "../../middleware/errorHandler";
import { authenticate } from "../../middleware/auth";
import { getObject, getFileUrl } from "../../services/storage";
import { prisma } from "../../lib/prisma";
import { config } from "../../config";
import { authenticateTrackAccess } from "./middleware";

// TODO: Extend Request type to include user property

const router = Router();

// Get cover art file (before auth middleware)
router.get(
  "/:id/cover",
  authenticateTrackAccess,
  async (req: Request, res: Response, next) => {
    try {
      const track = (req as any).track; // TODO: Fix this `any`
      if (!track.coverArt) {
        throw new AppError(404, "Cover art not found");
      }

      // Get file extension and determine mime type
      const ext = track.coverArt.split(".").pop()?.toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
        svg: "image/svg+xml",
      };
      const contentType = mimeTypes[ext || ""] || "application/octet-stream";

      // Stream the file directly from MinIO
      const fileStream = await getObject(track.coverArt);
      res.setHeader("Content-Type", contentType);
      fileStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

// Utility function to update last requested timestamp
async function updateLastRequestedAt(
  type: "full" | "stem",
  id: string,
  format: "wav" | "flac"
): Promise<void> {
  const timestampField =
    format === "wav" ? "wavLastRequestedAt" : "flacLastRequestedAt";

  if (type === "full") {
    await prisma.track.update({
      where: { id },
      data: { [timestampField]: new Date() },
    });
  } else {
    await prisma.stem.update({
      where: { id },
      data: { [timestampField]: new Date() },
    });
  }
}

// Get track stem file
router.get(
  "/:id/stem/:stemId.:format",
  authenticateTrackAccess,
  async (req: Request, res: Response, next) => {
    try {
      const track = (req as any).track; // TODO: Fix this `any`
      const stem = await prisma.stem.findUnique({
        where: { id: req.params.stemId, trackId: track.id },
      });
      if (!stem) {
        throw new AppError(404, "Stem not found");
      }

      const format = req.params.format.toLowerCase();

      let filePath: string;
      if (format === "mp3") {
        filePath = stem.mp3Url;
      } else if (format === "wav") {
        if (!stem.wavUrl) {
          throw new AppError(404, "WAV file not found");
        }
        filePath = stem.wavUrl;
        await updateLastRequestedAt("stem", stem.id, "wav");
      } else if (format === "flac") {
        if (!stem.flacUrl) {
          throw new AppError(404, "FLAC file not found");
        }
        filePath = stem.flacUrl;
        await updateLastRequestedAt("stem", stem.id, "flac");
      } else {
        throw new AppError(400, "Invalid format");
      }

      // Generate a presigned URL instead of streaming
      const presignedUrl = await getFileUrl(filePath, {
        // Expiry set to 2 minutes, for testing. TODO: Set to 7 days
        urlExpiryInSeconds: 2 * 60,
        cacheExpiryInSeconds: 2 * 60,
        isAttachment: req.query.hasOwnProperty("attachment"),
      });

      // Set cache control headers
      // Cache expiry set to 1 minute, for testing. TODO: Set to 3.5 days
      res.setHeader("Cache-Control", "public, max-age=60");
      res.setHeader("Expires", new Date(Date.now() + 60 * 1000).toUTCString());

      res.json({ url: presignedUrl });
    } catch (error) {
      next(error);
    }
  }
);

// Get full track file
router.get(
  "/:id/full.:format",
  authenticateTrackAccess,
  async (req: Request, res: Response, next) => {
    try {
      const track = (req as any).track; // TODO: Fix this `any`
      const format = req.params.format.toLowerCase();

      let filePath: string;
      if (format === "mp3") {
        filePath = track.fullTrackMp3Url;
      } else if (format === "wav") {
        filePath = track.fullTrackWavUrl;
        await updateLastRequestedAt("full", track.id, "wav");
      } else if (format === "flac") {
        filePath = track.fullTrackFlacUrl;
        await updateLastRequestedAt("full", track.id, "flac");
      } else {
        throw new AppError(400, "Invalid format");
      }

      // Generate a presigned URL instead of streaming
      const presignedUrl = await getFileUrl(filePath, {
        // Expiry set to 2 minutes, for testing. TODO: Set to 7 days
        urlExpiryInSeconds: 2 * 60,
        cacheExpiryInSeconds: 2 * 60,
        isAttachment: req.query.hasOwnProperty("attachment"),
      });

      // Set cache control headers
      // Cache expiry set to 1 minute, for testing. TODO: Set to 3.5 days
      res.setHeader("Cache-Control", "public, max-age=60");
      res.setHeader("Expires", new Date(Date.now() + 60 * 1000).toUTCString());

      res.json({ url: presignedUrl });
    } catch (error) {
      next(error);
    }
  }
);

// Get original track file
router.get(
  "/:id/original",
  authenticateTrackAccess,
  async (req: Request, res: Response, next) => {
    try {
      const track = await prisma.track.findFirst({
        where: {
          id: req.params.id,
          OR: [
            { userId: req.user!.id },
            { sharedWith: { some: { userId: req.user!.id } } },
          ],
        },
        select: {
          originalUrl: true,
          title: true,
          originalFormat: true,
        },
      });

      if (!track) {
        throw new AppError(404, "Track not found");
      }

      // Stream the file directly from MinIO
      const fileStream = await getObject(track.originalUrl);

      // Set appropriate content type for tracker files
      const mimeTypes: { [key: string]: string } = {
        xm: "audio/x-xm",
        it: "audio/x-it",
        mod: "audio/x-mod",
      };
      const contentType =
        mimeTypes[track.originalFormat.toLowerCase()] ||
        "application/octet-stream";

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${track.title}.${track.originalFormat}"`
      );
      fileStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

// Request audio file generation
router.post(
  "/:id/convert-audio",
  authenticateTrackAccess,
  async (req: Request, res: Response, next) => {
    try {
      const { type, stemId, format } = req.body;
      const mediaServiceUrl = config.services.mediaServiceUrl;

      if (!mediaServiceUrl) {
        throw new AppError(500, "Media service URL not configured");
      }

      const response = await fetch(
        mediaServiceUrl + "/api/media/convert-audio",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trackId: req.params.id,
            type,
            stemId,
            format,
          }),
        }
      );

      const data = await response.json();
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

// Get track audio file conversion status
router.get(
  "/:id/audio-conversion-status",
  authenticateTrackAccess,
  async (req, res, next) => {
    try {
      const { format } = req.query;
      const mediaServiceUrl = config.services.mediaServiceUrl;

      if (!mediaServiceUrl) {
        throw new AppError(500, "Media service URL not configured");
      }

      const response = await fetch(
        `${mediaServiceUrl}/api/media/audio-conversion-status/${req.params.id}?format=${format}`
      );
      const data = await response.json();
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

// Get stem audio file conversion status
router.get(
  "/:id/stem/:stemId/audio-conversion-status",
  authenticateTrackAccess,
  async (req: Request, res: Response, next) => {
    try {
      const mediaServiceUrl = config.services.mediaServiceUrl;

      if (!mediaServiceUrl) {
        throw new AppError(500, "Media service URL not configured");
      }

      const response = await fetch(
        `${mediaServiceUrl}/api/media/stem/${req.params.stemId}/audio-conversion-status`
      );
      const data = await response.json();
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

export { router as trackMediaRoutes };
