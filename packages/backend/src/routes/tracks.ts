import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../middleware/errorHandler";
import { uploadTrackFiles } from "../middleware/upload";
import { uploadFile, deleteFile } from "../services/storage";
import { z } from "zod";

const prisma = new PrismaClient();
const router = Router();

// Schema for track creation/update
const trackSchema = z.object({
  title: z.string().min(1),
  artist: z.string().min(1),
  originalFormat: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
  components: z.array(
    z.object({
      name: z.string().min(1),
      type: z.string().min(1),
    })
  ),
});

// Get all tracks
router.get("/", async (req, res, next) => {
  try {
    const tracks = await prisma.track.findMany({
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
      where: { id: req.params.id },
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
    const data = trackSchema.parse(req.body);
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files.original?.[0]) {
      throw new AppError(400, "Original track file is required");
    }

    if (
      !files.components ||
      files.components.length !== data.components.length
    ) {
      throw new AppError(400, "Component files do not match component data");
    }

    // Upload original file
    const originalUrl = await uploadFile(files.original[0], "originals/");

    // Upload cover art if provided
    let coverArtUrl: string | undefined;
    if (files.coverArt?.[0]) {
      coverArtUrl = await uploadFile(files.coverArt[0], "covers/");
    }

    // Upload component files and create track
    const componentUploads = await Promise.all(
      files.components.map(async (file, index) => {
        const wavUrl = await uploadFile(file, "components/");
        return {
          ...data.components[index],
          wavUrl,
        };
      })
    );

    const track = await prisma.track.create({
      data: {
        title: data.title,
        artist: data.artist,
        originalFormat: data.originalFormat,
        coverArt: coverArtUrl,
        metadata: data.metadata,
        components: {
          create: componentUploads,
        },
      },
      include: {
        components: true,
      },
    });

    res.status(201).json(track);
  } catch (error) {
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
      where: { id: req.params.id },
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

export { router as trackRoutes };
