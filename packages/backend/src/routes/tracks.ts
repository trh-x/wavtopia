import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";
import { uploadTrackFiles } from "../middleware/upload";
import { uploadFile, deleteFile, getFileUrl } from "../services/storage";
import { z } from "zod";
import { minioClient, bucket } from "../services/storage";

const prisma = new PrismaClient();
const router = Router();

// Schema for track creation/update
const trackSchema = z.object({
  title: z.string().min(1),
  artist: z.string().min(1),
  originalFormat: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
  components: z
    .array(
      z.object({
        name: z.string().min(1),
        type: z.string().min(1),
      })
    )
    .default([]),
});

// Apply authentication to all routes
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

    // Upload component files and create track
    interface ComponentUpload {
      name: string;
      type: string;
      wavUrl: string;
    }

    let componentUploads: ComponentUpload[] = [];
    if (files.components && files.components.length > 0) {
      console.log("Processing components:", files.components.length);
      if (files.components.length !== data.components.length) {
        throw new AppError(400, "Component files do not match component data");
      }

      componentUploads = await Promise.all(
        files.components.map(async (file, index) => {
          console.log(`Uploading component ${index + 1}:`, file.originalname);
          const wavUrl = await uploadFile(file, "components/");
          console.log(`Component ${index + 1} uploaded, URL:`, wavUrl);
          return {
            ...data.components[index],
            wavUrl,
          };
        })
      );
    }

    console.log("Creating track in database");
    const track = await prisma.track.create({
      data: {
        title: data.title,
        artist: data.artist,
        originalFormat: data.originalFormat,
        originalUrl: originalUrl,
        coverArt: coverArtUrl,
        metadata: data.metadata,
        userId: req.user!.id, // Associate track with user
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

    let componentUploads;
    if (files?.components && data.components) {
      if (files.components.length !== data.components.length) {
        throw new AppError(400, "Component files do not match component data");
      }

      componentUploads = await Promise.all(
        files.components.map(async (file, index) => {
          const wavUrl = await uploadFile(file, "components/");
          return {
            ...data.components![index],
            wavUrl,
          };
        })
      );
    }

    const track = await prisma.track.update({
      where: { id: req.params.id },
      data: {
        title: data.title,
        artist: data.artist,
        originalFormat: data.originalFormat,
        coverArt: coverArtUrl,
        metadata: data.metadata,
        components: componentUploads
          ? {
              deleteMany: {},
              create: componentUploads,
            }
          : undefined,
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

// Get original track file
router.get("/:id/original", async (req, res, next) => {
  try {
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

    // Get the file from MinIO as a buffer
    const fileStream = await minioClient.getObject(bucket, track.originalUrl);
    const chunks: Buffer[] = [];

    fileStream.on("data", (chunk) => chunks.push(chunk));
    fileStream.on("error", (err) => next(err));
    fileStream.on("end", () => {
      const fileBuffer = Buffer.concat(chunks);

      // Set headers for file download
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=original.${track.originalFormat}`
      );
      res.setHeader("Content-Length", fileBuffer.length);

      // Send the file
      res.send(fileBuffer);
    });
  } catch (error) {
    next(error);
  }
});

export { router as trackRoutes };
