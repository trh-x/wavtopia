import { Router } from "express";
import { AppError } from "../../middleware/errorHandler";
import { authenticate } from "../../middleware/auth";
import { z } from "zod";
import {
  AudioFileConversionStatus,
  Prisma,
  TrackStatus,
  updateUserStorage,
} from "@wavtopia/core-storage";
import { prisma } from "../../lib/prisma";
import { authenticateTrackAccess } from "./middleware";
import { uploadStemFile } from "../../middleware/upload";
import { config } from "../../config";

const router = Router();

// Schema for track forking
const forkTrackSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional().default(false),
});

// Schema for stem update
const updateStemSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().optional(),
});

function isAllowedStemFormat(format: string | undefined): boolean {
  if (format === undefined) {
    return false;
  }
  return format === "wav" || format === "flac";
}

// Fork a track
router.post("/:id/fork", authenticate, async (req, res, next) => {
  try {
    const data = forkTrackSchema.parse(req.body);
    const sourceTrackId = req.params.id;

    // Get the source track with all its stems
    const sourceTrack = await prisma.track.findUnique({
      where: {
        id: sourceTrackId,
        status: TrackStatus.ACTIVE,
      },
      include: {
        stems: true,
        primaryArtist: true,
        genres: {
          include: {
            genre: true,
          },
        },
        moods: {
          include: {
            mood: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!sourceTrack) {
      throw new AppError(404, "Source track not found");
    }

    // Check if user has access to the source track
    if (!sourceTrack.isPublic && sourceTrack.userId !== req.user!.id) {
      // Check if track is shared with user
      const sharedTrack = await prisma.trackShare.findFirst({
        where: {
          trackId: sourceTrackId,
          userId: req.user!.id,
        },
      });

      if (!sharedTrack) {
        throw new AppError(403, "You don't have permission to fork this track");
      }
    }

    // Create the forked track in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the forked track
      const forkedTrack = await tx.track.create({
        data: {
          title: data.title || `${sourceTrack.title} (Fork)`,
          primaryArtistId: sourceTrack.primaryArtistId,
          originalFormat: sourceTrack.originalFormat,
          originalUrl: sourceTrack.originalUrl,
          fullTrackWavUrl: sourceTrack.fullTrackWavUrl,
          fullTrackMp3Url: sourceTrack.fullTrackMp3Url,
          fullTrackFlacUrl: sourceTrack.fullTrackFlacUrl,
          waveformData: sourceTrack.waveformData,
          duration: sourceTrack.duration,
          coverArt: sourceTrack.coverArt,
          metadata: sourceTrack.metadata as Prisma.InputJsonValue,
          isPublic: data.isPublic,
          userId: req.user!.id,
          description: data.description || sourceTrack.description,
          bpm: sourceTrack.bpm,
          key: sourceTrack.key,
          isExplicit: sourceTrack.isExplicit,
          releaseDate: sourceTrack.releaseDate,
          releaseDatePrecision: sourceTrack.releaseDatePrecision,
          licenseId: sourceTrack.licenseId,
          // Forking fields
          forkedFromId: sourceTrack.id,
          isFork: true,
          // Copy size tracking but reset conversion status
          originalSizeBytes: sourceTrack.originalSizeBytes,
          mp3SizeBytes: sourceTrack.mp3SizeBytes,
          wavSizeBytes: sourceTrack.wavSizeBytes,
          flacSizeBytes: sourceTrack.flacSizeBytes,
          coverArtSizeBytes: sourceTrack.coverArtSizeBytes,
          totalQuotaSeconds: sourceTrack.totalQuotaSeconds,
        },
      });

      // Copy stems
      for (const stem of sourceTrack.stems) {
        await tx.stem.create({
          data: {
            index: stem.index,
            name: stem.name,
            type: stem.type,
            wavUrl: stem.wavUrl,
            mp3Url: stem.mp3Url,
            flacUrl: stem.flacUrl,
            waveformData: stem.waveformData,
            duration: stem.duration,
            trackId: forkedTrack.id,
            // Copy size tracking but reset conversion status
            mp3SizeBytes: stem.mp3SizeBytes,
            wavSizeBytes: stem.wavSizeBytes,
            flacSizeBytes: stem.flacSizeBytes,
          },
        });
      }

      // Copy genres
      if (sourceTrack.genres.length > 0) {
        await tx.trackGenre.createMany({
          data: sourceTrack.genres.map((tg) => ({
            trackId: forkedTrack.id,
            genreId: tg.genreId,
          })),
        });
      }

      // Copy moods
      if (sourceTrack.moods.length > 0) {
        await tx.trackMood.createMany({
          data: sourceTrack.moods.map((tm) => ({
            trackId: forkedTrack.id,
            moodId: tm.moodId,
          })),
        });
      }

      // Copy tags
      if (sourceTrack.tags.length > 0) {
        await tx.trackTag.createMany({
          data: sourceTrack.tags.map((tt) => ({
            trackId: forkedTrack.id,
            tagId: tt.tagId,
          })),
        });
      }

      return forkedTrack;
    });

    // Note: For forks, we don't update storage usage since we're copying file references,
    // not creating new files. The user gets access to the same files.

    // Return the complete forked track
    const completeForkedTrack = await prisma.track.findUnique({
      where: { id: result.id },
      include: {
        stems: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        primaryArtist: true,
        forkedFrom: {
          select: {
            id: true,
            title: true,
            primaryArtistName: true,
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(completeForkedTrack);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, "Invalid request data"));
    } else {
      next(error);
    }
  }
});

// Update stem in a forked track
router.patch(
  "/:id/stem/:stemId",
  authenticate,
  uploadStemFile,
  async (req, res, next) => {
    try {
      const data = updateStemSchema.parse(JSON.parse(req.body.data || "{}"));
      const { id: trackId, stemId } = req.params;

      // Verify track ownership and that it's a fork
      const track = await prisma.track.findUnique({
        where: {
          id: trackId,
          userId: req.user!.id,
          status: TrackStatus.ACTIVE,
          isFork: true,
        },
        include: {
          stems: true,
        },
      });

      if (!track) {
        throw new AppError(
          404,
          "Forked track not found or you don't have permission"
        );
      }

      // Verify stem exists and belongs to track
      const stem = await prisma.stem.findUnique({
        where: {
          id: stemId,
          trackId: track.id,
        },
      });

      if (!stem) {
        throw new AppError(404, "Stem not found");
      }

      // Handle file replacement if provided
      const file = req.file as Express.Multer.File;
      let stemFileUrl: string | undefined;
      let stemSizeBytes: number | undefined;
      let stemFileFormat: string | undefined;

      if (file) {
        const stemFile = file;
        stemFileUrl = "file://" + stemFile.path;
        stemSizeBytes = stemFile.size;
        stemFileFormat = stemFile.originalname.toLowerCase().split(".").pop();

        if (!isAllowedStemFormat(stemFileFormat)) {
          throw new AppError(
            400,
            "Only WAV and FLAC files are supported for stem replacement"
          );
        }
      }

      if (
        (data.name && data.name !== stem.name) ||
        (data.type && data.type !== stem.type)
      ) {
        await prisma.stem.update({
          where: { id: stemId },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.type && { type: data.type }),
          },
        });
      }

      if (stemFileUrl) {
        // Call media service to process the uploaded stem file
        const mediaServiceUrl = config.services.mediaServiceUrl;
        if (mediaServiceUrl) {
          try {
            const response = await fetch(
              mediaServiceUrl + "/api/media/process-stem",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  stemId,
                  stemFileUrl,
                  stemFileName: file.originalname,
                  trackId: track.id,
                  userId: req.user!.id,
                  operation: "replace_stem",
                }),
              }
            );

            if (!response.ok) {
              console.error(
                "Failed to queue stem processing:",
                await response.text()
              );
            } else {
              console.log("Stem processing queued successfully");
            }
          } catch (error) {
            console.error("Error calling media service:", error);
          }
        }
      }

      res.json({
        message: "Stem updated successfully",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, "Invalid request data"));
      } else {
        next(error);
      }
    }
  }
);

// Add new stem to a forked track
router.post(
  "/:id/stem",
  authenticate,
  uploadStemFile,
  async (req, res, next) => {
    try {
      const data = updateStemSchema.parse(JSON.parse(req.body.data || "{}"));
      const { id: trackId } = req.params;

      // Verify track ownership and that it's a fork
      const track = await prisma.track.findUnique({
        where: {
          id: trackId,
          userId: req.user!.id,
          status: TrackStatus.ACTIVE,
          isFork: true,
        },
        include: {
          stems: true,
        },
      });

      if (!track) {
        throw new AppError(
          404,
          "Forked track not found or you don't have permission"
        );
      }

      // Check if stem file was provided
      const file = req.file as Express.Multer.File;
      if (!file) {
        throw new AppError(400, "No stem file provided");
      }

      const stemFile = file;
      const stemFileUrl = "file://" + stemFile.path;

      // Get the next index for the new stem
      const maxIndex = track.stems.reduce(
        (max, stem) => Math.max(max, stem.index),
        -1
      );
      const nextIndex = maxIndex + 1;

      // Create the new stem
      const newStem = await prisma.stem.create({
        data: {
          index: nextIndex,
          name: data.name || stemFile.originalname,
          type: data.type || "audio",
          trackId: track.id,
        },
      });

      // Call media service to process the uploaded stem file
      const mediaServiceUrl = config.services.mediaServiceUrl;
      if (mediaServiceUrl) {
        try {
          const response = await fetch(
            mediaServiceUrl + "/api/media/process-stem",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                stemId: newStem.id,
                stemFileUrl,
                stemFileName: file.originalname,
                trackId: track.id,
                userId: req.user!.id,
                operation: "add_stem",
              }),
            }
          );

          if (!response.ok) {
            console.error(
              "Failed to queue stem processing:",
              await response.text()
            );
          } else {
            console.log("Stem processing queued successfully");
          }
        } catch (error) {
          console.error("Error calling media service:", error);
        }
      }

      res.status(201).json(newStem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, "Invalid request data"));
      } else {
        next(error);
      }
    }
  }
);

// Replace the full track audio file for a forked track
router.patch(
  "/:id/audio",
  authenticate,
  uploadStemFile,
  async (req, res, next) => {
    try {
      const { id: trackId } = req.params;

      // Verify track ownership and that it's a fork
      const track = await prisma.track.findUnique({
        where: {
          id: trackId,
          userId: req.user!.id,
          status: TrackStatus.ACTIVE,
          isFork: true,
        },
      });

      if (!track) {
        throw new AppError(
          404,
          "Forked track not found or you don't have permission"
        );
      }

      // Check if audio file was provided
      const file = req.file as Express.Multer.File;
      if (!file) {
        throw new AppError(400, "No audio file provided");
      }

      const audioFileUrl = "file://" + file.path;
      const audioFileSizeBytes = file.size;

      const fileExtension = file.originalname.toLowerCase().split(".").pop();

      if (!isAllowedStemFormat(fileExtension)) {
        throw new AppError(
          400,
          "Only WAV and FLAC files are supported for track audio replacement"
        );
      }

      // Determine the source format
      const originalFormat = fileExtension === "wav" ? "WAV" : "FLAC";

      // Update the track with new audio file
      const updatedTrack = await prisma.track.update({
        where: { id: trackId },
        data: {
          originalUrl: audioFileUrl,
          originalFormat: originalFormat as any,
          originalSizeBytes: audioFileSizeBytes,
          // Reset all converted files and conversion status when original is replaced
          fullTrackMp3Url: null,
          fullTrackWavUrl: null,
          fullTrackFlacUrl: null,
          wavConversionStatus: "NOT_STARTED",
          flacConversionStatus: "NOT_STARTED",
          // Reset waveform data and duration as they'll be regenerated
          waveformData: [],
          duration: null,
          // Reset derived size tracking
          mp3SizeBytes: null,
          wavSizeBytes: null,
          flacSizeBytes: null,
        },
      });

      // Update user storage
      const sizeDiff = audioFileSizeBytes - (track.originalSizeBytes || 0);
      if (sizeDiff !== 0) {
        await updateUserStorage(
          {
            userId: req.user!.id,
            secondsChange: 0, // Duration will be recalculated from the new file
          },
          prisma
        );
      }

      // Call media service to process the new audio file
      const mediaServiceUrl = config.services.mediaServiceUrl;
      if (mediaServiceUrl) {
        try {
          const response = await fetch(
            mediaServiceUrl + "/api/media/process-audio",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                trackId: updatedTrack.id,
                operation: "replace_track",
              }),
            }
          );

          if (!response.ok) {
            console.error(
              "Failed to queue track conversion:",
              await response.text()
            );
          } else {
            console.log("Track conversion queued successfully");
          }
        } catch (error) {
          console.error("Error calling media service:", error);
        }
      }

      res.json({
        message: "Track audio replaced successfully",
        track: updatedTrack,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete stem from a forked track
router.delete("/:id/stem/:stemId", authenticate, async (req, res, next) => {
  try {
    const { id: trackId, stemId } = req.params;

    // Verify track ownership and that it's a fork
    const track = await prisma.track.findUnique({
      where: {
        id: trackId,
        userId: req.user!.id,
        status: TrackStatus.ACTIVE,
        isFork: true,
      },
      include: {
        stems: true,
      },
    });

    if (!track) {
      throw new AppError(
        404,
        "Forked track not found or you don't have permission"
      );
    }

    // Verify stem exists and belongs to track
    const stem = await prisma.stem.findUnique({
      where: {
        id: stemId,
        trackId: track.id,
      },
    });

    if (!stem) {
      throw new AppError(404, "Stem not found");
    }

    // Don't allow deleting all stems
    if (track.stems.length <= 1) {
      throw new AppError(400, "Cannot delete the last stem from a track");
    }

    // Delete the stem
    await prisma.stem.delete({
      where: { id: stemId },
    });

    // Update user storage after deleting stem
    await updateUserStorage(
      {
        userId: req.user!.id,
        secondsChange: -(stem.duration || 0), // Remove deleted stem duration
      },
      prisma
    );

    // Queue track regeneration after stem deletion
    const mediaServiceUrl = config.services.mediaServiceUrl;
    if (mediaServiceUrl) {
      try {
        const regenerationResponse = await fetch(
          mediaServiceUrl + "/api/media/regenerate-track",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              trackId: track.id,
              reason: "stem_deleted",
              updatedStemId: stem.id,
            }),
          }
        );

        if (!regenerationResponse.ok) {
          console.error(
            "Failed to queue track regeneration:",
            await regenerationResponse.text()
          );
        } else {
          console.log(
            "Track regeneration queued successfully after stem deletion"
          );
        }
      } catch (error) {
        console.error("Error calling track regeneration service:", error);
      }
    }

    res.json({ message: "Stem deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// Get fork tree (original track and its forks)
router.get("/:id/forks", authenticateTrackAccess, async (req, res, next) => {
  try {
    const trackId = req.params.id;

    // Get the track and determine if it's a fork or original
    const track = (req as any).track;

    // If it's a fork, get the original track ID
    const originalTrackId = track.forkedFromId || trackId;

    // Get the original track and all its forks
    const originalTrack = await prisma.track.findUnique({
      where: { id: originalTrackId },
      select: {
        id: true,
        title: true,
        primaryArtistName: true,
        createdAt: true,
        isPublic: true,
        forkCount: true,
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    const forks = await prisma.track.findMany({
      where: {
        forkedFromId: originalTrackId,
        status: TrackStatus.ACTIVE,
        OR: [
          { isPublic: true },
          { userId: req.user?.id },
          { sharedWith: { some: { userId: req.user?.id } } },
        ],
      },
      select: {
        id: true,
        title: true,
        primaryArtistName: true,
        createdAt: true,
        isPublic: true,
        forkCount: true,
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      original: originalTrack,
      forks,
      total: forks.length,
    });
  } catch (error) {
    next(error);
  }
});

export { router as trackForkRoutes };
