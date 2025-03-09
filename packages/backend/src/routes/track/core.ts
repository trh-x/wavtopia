import { Router } from "express";
import { AppError } from "../../middleware/errorHandler";
import { authenticate } from "../../middleware/auth";
import { uploadTrackFiles } from "../../middleware/upload";
import { uploadFile } from "../../services/storage";
import { z } from "zod";
import {
  deleteLocalFile,
  Prisma,
  SourceFormat,
  TrackStatus,
} from "@wavtopia/core-storage";
import { prisma } from "../../lib/prisma";
import { config } from "../../config";
import { findOrCreateByName } from "../../utils/entityManagement";
import { authenticateTrackAccess } from "./middleware";

// TODO: Extend Request type to include user property

const router = Router();

// Schema for track creation/update
export const trackSchema = z.object({
  title: z.string().min(1),
  primaryArtistName: z.string().min(1),
  // TODO: originalFormat: z.nativeEnum(SourceFormat),
  originalFormat: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
  isPublic: z.boolean().optional(),
  // Musical Information
  bpm: z.number().optional(),
  key: z.string().optional(),
  isExplicit: z.boolean().optional(),
  // Metadata
  description: z.string().optional(),
  // Classification/Taxonomy
  genres: z.array(z.string()).optional(),
});

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
// TODO: Add support for updating additional fields/metadata
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

export { router as trackCoreRoutes };
