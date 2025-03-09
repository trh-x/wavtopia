import {
  Router,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import { AppError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";
import { verifyToken } from "../services/auth";
import { uploadTrackFiles } from "../middleware/upload";
import { uploadFile, getObject, getFileUrl } from "../services/storage";
import { z } from "zod";
import {
  deleteLocalFile,
  Prisma,
  SourceFormat,
  TrackStatus,
} from "@wavtopia/core-storage";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { findOrCreateByName } from "../utils/entityManagement";

// Extend Request type to include user property
const router = Router();

// Schema for track creation/update
const trackSchema = z.object({
  title: z.string().min(1),
  primaryArtistName: z.string().min(1),
  // TODO: originalFormat: z.nativeEnum(SourceFormat),
  originalFormat: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
  isPublic: z.boolean().optional(),
});

// Schema for track sharing
const shareTrackSchema = z.object({
  userIds: z.array(z.string()),
});

// Authentication helper that checks both header and query token
const authenticateTrackAccess: RequestHandler = async (
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

// Get single track
router.get("/:id", authenticateTrackAccess, async (req, res, next) => {
  try {
    const baseTrack = (req as any).track;

    // Execute all three queries as a single transaction without referencing the tracks table
    // This sends all queries to the database in a single round trip
    const [user, stems, sharedUsers] = await prisma.$transaction([
      // Get owner directly by ID
      prisma.user.findUnique({
        where: { id: baseTrack.userId },
        select: {
          id: true,
          username: true,
          email: true,
        },
      }),

      // Get stems directly by trackId
      prisma.stem.findMany({
        where: { trackId: baseTrack.id },
      }),

      // Get shared users directly by trackId
      prisma.trackShare.findMany({
        where: { trackId: baseTrack.id },
        select: {
          id: true,
          userId: true,
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      }),
    ]);

    if (!user) {
      return next(new AppError(404, "Track owner not found"));
    }

    // Combine everything into the final response
    const fullTrack = {
      ...baseTrack,
      user,
      stems,
      sharedWith: sharedUsers,
    };

    res.json(fullTrack);
  } catch (error) {
    next(error);
  }
});

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
      const stem = track.stems.find(
        (s: any) => s.id === req.params.stemId // TODO: Fix this `any`
      );
      if (!stem) {
        throw new AppError(404, "Stem not found");
      }

      const format = req.params.format.toLowerCase();

      let filePath: string;
      if (format === "mp3") {
        filePath = stem.mp3Url;
      } else if (format === "wav") {
        filePath = stem.wavUrl;
        await updateLastRequestedAt("stem", stem.id, "wav");
      } else if (format === "flac") {
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

// Apply authentication middleware for all other routes
router.use(authenticate);

// Create track with files
router.post("/", uploadTrackFiles, async (req, res, next) => {
  try {
    const data = trackSchema.parse(JSON.parse(req.body.data));
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files.original?.[0]) {
      throw new AppError(400, "No track file provided");
    }

    console.log("Starting track upload process...");
    console.log("Files received:", {
      original: files.original?.[0]?.originalname,
      coverArt: files.coverArt?.[0]?.originalname,
    });

    const originalFile = files.original[0];

    // The original file is stored on disk at this point
    const originalFileUrl = "file://" + originalFile.path;
    console.log("Original file URL:", originalFileUrl);

    // Store cover art if provided
    let coverArtUrl: string | undefined;
    if (files.coverArt?.[0]) {
      // The cover art is stored on disk at this point
      coverArtUrl = "file://" + files.coverArt[0].path;
      console.log("Cover art URL:", coverArtUrl);
    }

    const originalFormat = {
      xm: SourceFormat.XM,
      it: SourceFormat.IT,
      mod: SourceFormat.MOD,
    }[data.originalFormat];

    if (!originalFormat) {
      throw new AppError(
        400,
        `Invalid original format: ${data.originalFormat}`
      );
    }

    console.log("Creating database record...");
    try {
      const primaryArtist = await findOrCreateByName(
        "artist",
        data.primaryArtistName
      );

      const track = await prisma.track.create({
        data: {
          title: data.title,
          primaryArtistId: primaryArtist.id,
          originalFormat,
          originalUrl: originalFileUrl,
          coverArt: coverArtUrl,
          metadata: data.metadata as Prisma.InputJsonValue,
          userId: req.user!.id,
        },
      });

      console.log("Track created successfully:", track.id);

      // Now POST to the media service to convert the track
      const mediaServiceUrl = config.services.mediaServiceUrl;
      if (mediaServiceUrl) {
        const response = await fetch(
          mediaServiceUrl + "/api/media/convert-module",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ trackId: track.id }),
          }
        );
        const data = await response.json();
        console.log("Media service response:", data);
      } else {
        console.warn("Media service URL not set");
      }

      res.status(201).json(track);
    } catch (dbError) {
      console.error("Database error during track creation:", dbError);

      // Clean up uploaded files if database operation fails
      console.log("Cleaning up uploaded files...");
      try {
        await Promise.all([
          // Delete the local files
          deleteLocalFile(originalFileUrl),
          ...(coverArtUrl ? [deleteLocalFile(coverArtUrl)] : []),
        ]);
        console.log("Cleanup completed");
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
      }

      // Check for disk space error
      if (
        typeof dbError === "object" &&
        dbError !== null &&
        "code" in dbError &&
        dbError.code === "53100"
      ) {
        throw new AppError(
          507,
          "Insufficient storage space. Please contact support."
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Error in track creation:", error);
    next(error);
  }
});

// Update track
router.patch("/:id", uploadTrackFiles, async (req, res, next) => {
  try {
    // Check if track belongs to user
    const existingTrack = await prisma.track.findUnique({
      where: {
        id: req.params.id,
        userId: req.user!.id,
        status: TrackStatus.ACTIVE,
      },
    });

    if (!existingTrack) {
      throw new AppError(404, "Track not found");
    }

    const data = trackSchema.partial().parse(req.body);
    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;

    // Handle file updates if provided
    let coverArtUrl: string | undefined;
    if (files?.coverArt?.[0]) {
      coverArtUrl = await uploadFile(files.coverArt[0], "covers/");
    }

    const originalFormat = data.originalFormat
      ? {
          xm: SourceFormat.XM,
          it: SourceFormat.IT,
          mod: SourceFormat.MOD,
        }[data.originalFormat]
      : undefined;

    const primaryArtist = data.primaryArtistName
      ? await findOrCreateByName("artist", data.primaryArtistName)
      : undefined;

    const track = await prisma.track.update({
      where: { id: req.params.id },
      data: {
        title: data.title,
        primaryArtistId: primaryArtist?.id,
        originalFormat,
        coverArt: coverArtUrl,
        metadata: data.metadata as Prisma.InputJsonValue,
      },
      include: {
        stems: true,
      },
    });

    res.json(track);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, "Invalid request data"));
    } else {
      next(error);
    }
  }
});

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

export { router as trackRoutes };
