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
  Genre,
} from "@wavtopia/core-storage";
import { prisma } from "../../lib/prisma";
import { config } from "../../config";
import { findOrCreateByName } from "../../utils/entityManagement";
import { authenticateTrackAccess } from "./middleware";
import { DatePrecision } from "@wavtopia/core-storage";

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
  // Release Information
  releaseDate: z.string().datetime().optional(),
  releaseDatePrecision: z.nativeEnum(DatePrecision).optional(),
  // Metadata
  description: z.string().optional(),
  // Classification/Taxonomy
  genres: z.array(z.string()).optional(),
  // License
  licenseId: z.string().uuid("License ID must be a valid UUID"),
});

// Get single track
router.get("/:id", authenticateTrackAccess, async (req, res, next) => {
  try {
    const baseTrack = (req as any).track;

    const trackUser = req.user?.id === baseTrack.userId && req.user;

    const transactions = [
      // Get stems directly by trackId
      prisma.stem.findMany({
        where: { trackId: baseTrack.id },
      }),

      // Get shared users directly by trackId
      // TODO: Modify the UI so shared users are retrieved on demand
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

      // Include a request for the track owner if the user is not already selected
      ...(trackUser
        ? []
        : [
            prisma.user.findUnique({
              where: { id: baseTrack.userId },
              select: {
                id: true,
                username: true,
                email: true,
              },
            }),
          ]),
    ];

    // Execute all queries as a single transaction without referencing the tracks table
    // This sends all queries to the database in a single round trip
    const [stems, sharedUsers, maybeUser] = await prisma.$transaction(
      transactions
    );

    const user = trackUser || maybeUser;

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

// Function to efficiently find or create multiple genres
async function findOrCreateGenres(genreNames: string[]) {
  if (!genreNames.length) return [];

  // Deduplicate input array
  const uniqueGenres = [...new Set(genreNames)];

  // First, find all existing genres in a single query
  const existingGenres = await prisma.genre.findMany({
    where: {
      name: {
        in: uniqueGenres,
      },
    },
  });

  // Determine which genres don't exist yet
  const existingGenreNames = existingGenres.map((genre) => genre.name);
  const genresToCreate = uniqueGenres.filter(
    (name) => !existingGenreNames.includes(name)
  );

  // Create missing genres in a single transaction
  let newGenres: Genre[] = [];
  if (genresToCreate.length > 0) {
    newGenres = await prisma.$transaction(
      genresToCreate.map((name) =>
        prisma.genre.create({
          data: { name },
        })
      )
    );
  }

  // Return combined results
  return [...existingGenres, ...newGenres];
}

// Create track with files
router.post("/", authenticate, uploadTrackFiles, async (req, res, next) => {
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

      const genres = await findOrCreateGenres(data.genres || []);

      const track = await prisma.track.create({
        data: {
          title: data.title,
          primaryArtistId: primaryArtist.id,
          originalFormat,
          originalUrl: originalFileUrl,
          coverArt: coverArtUrl,
          metadata: data.metadata as Prisma.InputJsonValue,
          userId: req.user!.id,
          bpm: data.bpm,
          key: data.key,
          isExplicit: data.isExplicit,
          description: data.description,
          licenseId: data.licenseId,
          ...(data.releaseDate && data.releaseDatePrecision
            ? {
                releaseDate: new Date(data.releaseDate),
                releaseDatePrecision: data.releaseDatePrecision,
              }
            : {}),
          ...(data.genres && data.genres.length > 0
            ? {
                genres: {
                  create: genres.map((genre) => ({
                    genre: {
                      connect: {
                        id: genre.id,
                      },
                    },
                  })),
                },
              }
            : {}),
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
router.patch("/:id", authenticate, uploadTrackFiles, async (req, res, next) => {
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

    // const genres = await findOrCreateGenres(data.genres || []);

    const track = await prisma.track.update({
      where: { id: req.params.id },
      data: {
        title: data.title,
        primaryArtistId: primaryArtist?.id,
        originalFormat,
        coverArt: coverArtUrl,
        metadata: data.metadata as Prisma.InputJsonValue,
        /* FIXME: Don't attach genres if they already exist
        genres: {
          create: genres.map((genre) => ({
            genre: {
              connect: {
                id: genre.id,
              },
            },
          })),
        },
        */
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
