import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";
import { uploadTrackFiles } from "../middleware/upload";
import { uploadFile, deleteFile, getFileUrl } from "../services/storage";
import { convertXMToWAV } from "../services/wav-converter";
import { z } from "zod";
import { minioClient, bucket } from "../services/storage";
import { Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// Schema for track creation/update
const trackSchema = z.object({
  title: z.string().min(1),
  artist: z.string().min(1),
  originalFormat: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
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
      select: {
        originalFormat: true,
        originalUrl: true,
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

    // Upload full track WAV
    console.log("Uploading full track WAV");
    const fullTrackUrl = await uploadFile(
      {
        buffer: fullTrackBuffer,
        originalname: "full_track.wav",
        mimetype: "audio/wav",
      } as Express.Multer.File,
      "full_tracks/"
    );
    console.log("Full track WAV uploaded, URL:", fullTrackUrl);

    // Upload component files
    const componentUploads = await Promise.all(
      convertedComponents.map(async (component) => {
        console.log(`Uploading component: ${component.name}`);
        const wavUrl = await uploadFile(
          {
            buffer: component.buffer,
            originalname: component.filename,
            mimetype: "audio/wav",
          } as Express.Multer.File,
          "components/"
        );
        console.log(`Component uploaded, URL:`, wavUrl);
        return {
          name: component.name,
          type: component.type,
          wavUrl,
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

// Add endpoint to get full track WAV
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
      select: {
        title: true,
        fullTrackUrl: true,
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

    if (track.coverArt) {
      await deleteFile(track.coverArt);
    }

    for (const component of track.components) {
      await deleteFile(component.wavUrl);
    }

    await prisma.track.delete({
      where: { id: req.params.id },
    });

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export { router as trackRoutes };
