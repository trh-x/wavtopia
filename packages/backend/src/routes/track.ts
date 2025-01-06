import {
  Router,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";
import { verifyToken } from "../services/auth";
import { uploadTrackFiles } from "../middleware/upload";
import { uploadFile, deleteFile, getFileUrl } from "../services/storage";
import { convertXMToWAV } from "../services/wav-converter";
import { convertWAVToMP3 } from "../services/mp3-converter";
import { z } from "zod";
import { minioClient, bucket } from "../services/storage";
import { Prisma, Role } from "@prisma/client";
import { generateWaveformData } from "../services/waveform";

// Extend Request type to include user property
const prisma = new PrismaClient();
const router = Router();

// Schema for track creation/update
const trackSchema = z.object({
  title: z.string().min(1),
  artist: z.string().min(1),
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

    // First check if track is public
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { sharedWith: true },
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
    const reqTrack = await prisma.track.findUnique({
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

    if (!reqTrack) {
      return next(new AppError(404, "Track not found"));
    }

    // Only allow access to certain fields for public tracks when user is not authenticated
    if (reqTrack.isPublic && !req.user) {
      const publicTrack = {
        id: reqTrack.id,
        title: reqTrack.title,
        artist: reqTrack.artist,
        coverArt: reqTrack.coverArt,
        isPublic: reqTrack.isPublic,
        fullTrackUrl: reqTrack.fullTrackUrl,
        fullTrackMp3Url: reqTrack.fullTrackMp3Url,
        originalFormat: reqTrack.originalFormat,
        waveformData: reqTrack.waveformData,
        components: reqTrack.components,
        user: reqTrack.user,
        createdAt: reqTrack.createdAt,
        updatedAt: reqTrack.updatedAt,
      };
      (req as any).track = publicTrack; // TODO: Fix this `any`
    } else {
      (req as any).track = reqTrack; // TODO: Fix this `any`
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Get single track
router.get("/:id", authenticateTrackAccess, async (req, res, next) => {
  try {
    const track = (req as any).track; // TODO: Fix this `any`
    res.json(track);
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
      const fileStream = await minioClient.getObject(bucket, track.coverArt);
      res.setHeader("Content-Type", contentType);
      fileStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

// Get track component file (before auth middleware)
router.get(
  "/:id/component/:componentId.:format",
  authenticateTrackAccess,
  async (req: Request, res: Response, next) => {
    try {
      const track = (req as any).track; // TODO: Fix this `any`
      const component = track.components.find(
        (c: any) => c.id === req.params.componentId // TODO: Fix this `any`
      );
      if (!component) {
        throw new AppError(404, "Component not found");
      }

      const format = req.params.format.toLowerCase();
      const filePath = format === "mp3" ? component.mp3Url : component.wavUrl;

      // Stream the file directly from MinIO
      const fileStream = await minioClient.getObject(bucket, filePath);
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${component.name}.${format}"`
      );
      fileStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

// Get full track file (before auth middleware)
router.get(
  "/:id/full.:format",
  authenticateTrackAccess,
  async (req: Request, res: Response, next) => {
    try {
      const track = (req as any).track; // TODO: Fix this `any`
      const format = req.params.format.toLowerCase();
      const filePath =
        format === "mp3" ? track.fullTrackMp3Url : track.fullTrackUrl;

      // Stream the file directly from MinIO
      const fileStream = await minioClient.getObject(bucket, filePath);
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${track.title}.${format}"`
      );
      fileStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

// Get original track file (before auth middleware)
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
      const fileStream = await minioClient.getObject(bucket, track.originalUrl);
      res.setHeader("Content-Type", "application/octet-stream");
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
    const originalName = originalFile.originalname.replace(/\.[^/.]+$/, "");

    // Upload original file
    console.log("Uploading original file...");
    const originalUrl = await uploadFile(originalFile, "originals/");
    console.log("Original file uploaded:", originalUrl);

    // Upload cover art if provided
    let coverArtUrl: string | undefined;
    if (files.coverArt?.[0]) {
      console.log("Uploading cover art...");
      coverArtUrl = await uploadFile(files.coverArt[0], "covers/");
      console.log("Cover art uploaded:", coverArtUrl);
    }

    // Convert XM to WAV
    console.log("Converting XM to WAV...");
    const { fullTrackBuffer, components } = await convertXMToWAV(
      originalFile.buffer
    );
    console.log("XM conversion complete. Components:", components.length);

    // Generate waveform data for full track
    console.log("Generating waveform data for full track...");
    const fullTrackWaveform = await generateWaveformData(fullTrackBuffer);
    console.log("Full track waveform data generated");

    // Convert full track to MP3
    console.log("Converting full track to MP3...");
    const fullTrackMp3Buffer = await convertWAVToMP3(fullTrackBuffer);
    console.log("Full track MP3 conversion complete");

    // Upload full track files
    console.log("Uploading full track files...");
    const [fullTrackUrl, fullTrackMp3Url] = await Promise.all([
      uploadFile(
        {
          buffer: fullTrackBuffer,
          originalname: `${originalName}_full.wav`,
          mimetype: "audio/wav",
        } as Express.Multer.File,
        "tracks/"
      ),
      uploadFile(
        {
          buffer: fullTrackMp3Buffer,
          originalname: `${originalName}_full.mp3`,
          mimetype: "audio/mpeg",
        } as Express.Multer.File,
        "tracks/"
      ),
    ]);
    console.log("Full track files uploaded");

    // Convert and upload component files
    console.log("Processing components...");
    const componentUploads = await Promise.all(
      components.map(async (component, index) => {
        console.log(
          `Processing component ${index + 1}/${components.length}: ${
            component.name
          }`
        );
        const mp3Buffer = await convertWAVToMP3(component.buffer);
        const componentName = `${originalName}_${component.name.replace(
          /[^a-z0-9]/gi,
          "_"
        )}`;

        const waveformData = await generateWaveformData(component.buffer);
        console.log(`Generated waveform data for component: ${component.name}`);

        const [wavUrl, mp3Url] = await Promise.all([
          uploadFile(
            {
              buffer: component.buffer,
              originalname: `${componentName}.wav`,
              mimetype: "audio/wav",
            } as Express.Multer.File,
            "components/"
          ),
          uploadFile(
            {
              buffer: mp3Buffer,
              originalname: `${componentName}.mp3`,
              mimetype: "audio/mpeg",
            } as Express.Multer.File,
            "components/"
          ),
        ]);

        console.log(`Component ${component.name} files uploaded`);
        return {
          name: component.name,
          type: component.type,
          wavUrl,
          mp3Url,
          waveformData,
        };
      })
    );

    console.log("Creating database record...");
    try {
      const track = await prisma.track.create({
        data: {
          title: data.title,
          artist: data.artist,
          originalFormat: data.originalFormat,
          originalUrl: originalUrl,
          fullTrackUrl: fullTrackUrl,
          fullTrackMp3Url: fullTrackMp3Url,
          waveformData: fullTrackWaveform,
          coverArt: coverArtUrl,
          metadata: data.metadata as Prisma.InputJsonValue,
          userId: req.user!.id,
          components: {
            create: componentUploads,
          },
        },
        include: {
          components: true,
        },
      });

      console.log("Track created successfully:", track.id);
      res.status(201).json(track);
    } catch (dbError) {
      console.error("Database error during track creation:", dbError);

      // Clean up uploaded files if database operation fails
      console.log("Cleaning up uploaded files...");
      try {
        await Promise.all([
          deleteFile(originalUrl),
          deleteFile(fullTrackUrl),
          deleteFile(fullTrackMp3Url),
          ...(coverArtUrl ? [deleteFile(coverArtUrl)] : []),
          ...componentUploads.flatMap((comp) => [
            deleteFile(comp.wavUrl),
            deleteFile(comp.mp3Url),
          ]),
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

    const track = await prisma.track.update({
      where: { id: req.params.id },
      data: {
        title: data.title,
        artist: data.artist,
        originalFormat: data.originalFormat,
        coverArt: coverArtUrl,
        metadata: data.metadata as Prisma.InputJsonValue,
      },
      include: {
        components: true,
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

// Delete track and associated files
router.delete("/:id", async (req, res, next) => {
  try {
    const track = await prisma.track.findUnique({
      where: {
        id: req.params.id,
        userId: req.user!.id, // Only delete user's own track
      },
      include: { components: true },
    });

    if (!track) {
      throw new AppError(404, "Track not found");
    }

    // Delete all associated files
    await deleteFile(track.originalUrl);
    await deleteFile(track.fullTrackUrl);
    await deleteFile(track.fullTrackMp3Url);

    if (track.coverArt) {
      await deleteFile(track.coverArt);
    }

    for (const component of track.components) {
      await deleteFile(component.wavUrl);
      await deleteFile(component.mp3Url);
    }

    await prisma.track.delete({
      where: { id: req.params.id },
    });

    res.status(204).end();
  } catch (error) {
    next(error);
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

export { router as trackRoutes };
