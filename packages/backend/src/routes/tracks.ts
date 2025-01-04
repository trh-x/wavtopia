import { Router, Request as ExpressRequest, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";
import { uploadTrackFiles } from "../middleware/upload";
import { uploadFile, deleteFile, getFileUrl } from "../services/storage";
import { convertXMToWAV } from "../services/wav-converter";
import { convertWAVToMP3 } from "../services/mp3-converter";
import { z } from "zod";
import { minioClient, bucket } from "../services/storage";
import { Prisma, Role } from "@prisma/client";
import { generateWaveformData } from "../services/waveform";

// Extend Request type to include user property
interface AuthenticatedRequest extends ExpressRequest {
  user?: {
    id: string;
    role: Role;
  };
}

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

// Get original track file (before global auth middleware)
router.get("/:id/original", async (req, res, next) => {
  try {
    // Get token from query parameter
    const token = req.query.token as string;
    if (!token) {
      throw new AppError(401, "No token provided");
    }

    // Set the token in the Authorization header for the authenticate middleware
    req.headers.authorization = `Bearer ${token}`;

    // Call authenticate middleware manually
    await new Promise((resolve, reject) => {
      authenticate(req, res, (err) => {
        if (err) reject(err);
        else resolve(undefined);
      });
    });

    const track = await prisma.track.findUnique({
      where: {
        id: req.params.id,
        userId: req.user!.id, // Only get user's own track
      },
      include: {
        components: true,
      },
    });

    if (!track) {
      throw new AppError(404, "Track not found");
    }

    // Stream the file directly from MinIO
    const fileStream = await minioClient.getObject(bucket, track.originalUrl);

    // Set headers for file download
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=original.${track.originalFormat}`
    );

    // Pipe the file stream directly to the response
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
});

// Get full track WAV file (before global auth middleware)
router.get("/:id/full", async (req, res, next) => {
  try {
    // Get token from query parameter
    const token = req.query.token as string;
    if (!token) {
      throw new AppError(401, "No token provided");
    }

    // Set the token in the Authorization header for the authenticate middleware
    req.headers.authorization = `Bearer ${token}`;

    // Call authenticate middleware manually
    await new Promise((resolve, reject) => {
      authenticate(req, res, (err) => {
        if (err) reject(err);
        else resolve(undefined);
      });
    });

    const track = await prisma.track.findUnique({
      where: {
        id: req.params.id,
        userId: req.user!.id, // Only get user's own track
      },
      include: {
        components: true,
      },
    });

    if (!track) {
      throw new AppError(404, "Track not found");
    }

    // Stream the file directly from MinIO
    const fileStream = await minioClient.getObject(bucket, track.fullTrackUrl);

    // Set headers for file download
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${track.title}.wav"`
    );

    // Pipe the file stream directly to the response
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
});

// Get component WAV file (before global auth middleware)
router.get("/:id/component/:componentId.wav", async (req, res, next) => {
  try {
    // Get token from query parameter
    const token = req.query.token as string;
    if (!token) {
      throw new AppError(401, "No token provided");
    }

    // Set the token in the Authorization header for the authenticate middleware
    req.headers.authorization = `Bearer ${token}`;

    // Call authenticate middleware manually
    await new Promise((resolve, reject) => {
      authenticate(req, res, (err) => {
        if (err) reject(err);
        else resolve(undefined);
      });
    });

    const track = await prisma.track.findUnique({
      where: {
        id: req.params.id,
        userId: req.user!.id, // Only get user's own track
      },
      include: {
        components: true,
      },
    });

    if (!track || track.components.length === 0) {
      throw new AppError(404, "Track or component not found");
    }

    const component = track.components[0];

    // Stream the file directly from MinIO
    const fileStream = await minioClient.getObject(bucket, component.wavUrl);

    // Set headers for file download
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${component.name}.wav"`
    );

    // Pipe the file stream directly to the response
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
});

// Shared function for token authentication
async function authenticateWithToken(req: AuthenticatedRequest, res: Response) {
  const token = req.query.token as string;
  if (!token) {
    throw new AppError(401, "No token provided");
  }

  req.headers.authorization = `Bearer ${token}`;
  await new Promise<void>((resolve, reject) => {
    authenticate(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Add MP3 routes before the auth middleware
router.get("/:id/full.mp3", async (req, res, next) => {
  try {
    await authenticateWithToken(req, res);

    const track = await prisma.track.findUnique({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      select: {
        title: true,
        fullTrackMp3Url: true,
      },
    });

    if (!track) {
      throw new AppError(404, "Track not found");
    }

    const fileStream = await minioClient.getObject(
      bucket,
      track.fullTrackMp3Url
    );
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${track.title}.mp3"`
    );
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
});

router.get(
  "/:id/component/:componentId.mp3",
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      console.log("Component MP3 request params:", {
        trackId: req.params.id,
        componentId: req.params.componentId,
      });

      await authenticateWithToken(req, res);

      console.log("Authenticated user:", req.user?.id);

      const component = await prisma.component.findFirst({
        where: {
          id: req.params.componentId,
          trackId: req.params.id,
          track: {
            userId: req.user!.id,
          },
        },
      });

      console.log("Found component:", component);

      if (!component) {
        throw new AppError(404, "Track or component not found");
      }

      console.log("Component details:", {
        id: component.id,
        name: component.name,
        mp3Url: component.mp3Url,
      });

      const fileStream = await minioClient.getObject(bucket, component.mp3Url);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${component.name}.mp3"`
      );
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error in component MP3 endpoint:", error);
      next(error);
    }
  }
);

// Get all public tracks
router.get(
  "/public",
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const publicTracks = await prisma.track.findMany({
        where: {
          isPublic: true,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });
      res.json(publicTracks);
    } catch (error) {
      next(error);
    }
  }
);

// Apply authentication to all other routes
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

// Get single track
router.get("/:id", async (req, res, next) => {
  try {
    const track = await prisma.track.findUnique({
      where: {
        id: req.params.id,
        userId: req.user!.id, // Only get user's own track
      },
      include: {
        components: true,
      },
    });

    if (!track) {
      throw new AppError(404, "Track not found");
    }

    res.json(track);
  } catch (error) {
    next(error);
  }
});

// Create track with files
router.post("/", uploadTrackFiles, async (req, res, next) => {
  try {
    console.log("Received track upload request");

    // Parse the metadata from the data field
    console.log("Request body data:", req.body.data);
    const metadata = JSON.parse(req.body.data);
    console.log("Parsed metadata:", metadata);

    const data = trackSchema.parse(metadata);
    console.log("Validated data:", data);

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    console.log("Received files:", Object.keys(files));

    if (!files.original?.[0]) {
      throw new AppError(400, "Original track file is required");
    }

    // Upload original file
    console.log("Uploading original file:", files.original[0].originalname);
    const originalUrl = await uploadFile(files.original[0], "originals/");
    console.log("Original file uploaded, URL:", originalUrl);

    // Upload cover art if provided
    let coverArtUrl: string | undefined;
    if (files.coverArt?.[0]) {
      console.log("Uploading cover art:", files.coverArt[0].originalname);
      coverArtUrl = await uploadFile(files.coverArt[0], "covers/");
      console.log("Cover art uploaded, URL:", coverArtUrl);
    }

    // Convert XM to WAV components and full track
    console.log("Converting XM to WAV");
    const { fullTrackBuffer, components: convertedComponents } =
      await convertXMToWAV(files.original[0].buffer);
    console.log("Generated components:", convertedComponents.length);

    // Generate waveform data for full track
    console.log("Generating waveform data for full track");
    const fullTrackWaveform = await generateWaveformData(fullTrackBuffer);

    // Convert full track to MP3
    console.log("Converting full track to MP3");
    const fullTrackMp3Buffer = await convertWAVToMP3(fullTrackBuffer);

    // Upload full track WAV and MP3
    console.log("Uploading full track WAV and MP3");
    const originalName = files.original[0].originalname.replace(/\.xm$/i, "");
    const [fullTrackUrl, fullTrackMp3Url] = await Promise.all([
      uploadFile(
        {
          buffer: fullTrackBuffer,
          originalname: `${originalName}.wav`,
          mimetype: "audio/wav",
        } as Express.Multer.File,
        "full_tracks/"
      ),
      uploadFile(
        {
          buffer: fullTrackMp3Buffer,
          originalname: `${originalName}.mp3`,
          mimetype: "audio/mpeg",
        } as Express.Multer.File,
        "full_tracks/"
      ),
    ]);
    console.log("Full track files uploaded, URLs:", {
      fullTrackUrl,
      fullTrackMp3Url,
    });

    // Convert and upload component files
    const componentUploads = await Promise.all(
      convertedComponents.map(async (component, index) => {
        console.log(`Converting and uploading component: ${component.name}`);
        const mp3Buffer = await convertWAVToMP3(component.buffer);
        const componentName = `${originalName}_${component.name.replace(
          /[^a-z0-9]/gi,
          "_"
        )}`;

        // Generate waveform data for component
        console.log(
          `Generating waveform data for component: ${component.name}`
        );
        const waveformData = await generateWaveformData(component.buffer);

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

        console.log(`Component uploaded, URLs:`, { wavUrl, mp3Url });
        return {
          name: component.name,
          type: component.type,
          wavUrl,
          mp3Url,
          waveformData,
        };
      })
    );

    console.log("Creating track in database");
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
  } catch (error) {
    console.error("Error in track creation:", error);
    if (error instanceof z.ZodError) {
      next(new AppError(400, "Invalid request data"));
    } else {
      next(error);
    }
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

// Get tracks shared with the current user
router.get(
  "/shared",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next) => {
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
              username: true,
            },
          },
        },
      });
      res.json(sharedTracks);
    } catch (error) {
      next(error);
    }
  }
);

// Share a track with other users
router.post(
  "/:id/share",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next) => {
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
  }
);

// Remove track sharing for specific users
router.delete(
  "/:id/share",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next) => {
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
  }
);

// Update track visibility
router.patch(
  "/:id/visibility",
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { isPublic } = z.object({ isPublic: z.boolean() }).parse(req.body);

      const track = await prisma.track.update({
        where: {
          id: req.params.id,
          userId: req.user!.id,
        },
        data: {
          isPublic,
        },
      });

      res.json(track);
    } catch (error) {
      next(error);
    }
  }
);

// Modify the existing track routes to check for public access
const canAccessTrack = async (trackId: string, userId?: string) => {
  const track = await prisma.track.findUnique({
    where: {
      id: trackId,
    },
    include: {
      sharedWith: true,
    },
  });

  if (!track) return false;

  return (
    track.isPublic ||
    track.userId === userId ||
    track.sharedWith.some((share) => share.userId === userId)
  );
};

export { router as trackRoutes };
