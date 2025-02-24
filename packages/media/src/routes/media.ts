import { Router } from "express";
import { AppError } from "../middleware/errorHandler";
import {
  queueTrackConversion,
  trackConversionQueue,
  queueAudioFileConversion,
  audioFileConversionQueue,
  fileCleanupQueue,
} from "../services/queue";
import { queueTrackDeletion } from "../services/queue/track-deletion-queue";
import { runCleanupJobNow } from "../services/queue/file-cleanup-queue";
import { z } from "zod";
import {
  AudioFileConversionStatus,
  PrismaService,
  config,
} from "@wavtopia/core-storage";

const prisma = new PrismaService(config.database).db;

export const router = Router();

const conversionOptionsSchema = z.object({
  trackId: z.string().uuid(),
});

const audioFileConversionOptionsSchema = z.object({
  trackId: z.string().uuid(),
  type: z.enum(["full", "stem"]),
  stemId: z.string().uuid().optional(),
  format: z.enum(["wav", "flac"]),
});

const trackDeletionSchema = z.object({
  trackIds: z.array(z.string().uuid()).min(1),
});

// Convert track module file to MP3/FLAC format
router.post("/convert-module", async (req, res, next) => {
  try {
    // Parse conversion options
    const options = conversionOptionsSchema.parse(req.body);

    const jobId = await queueTrackConversion(options.trackId);

    res.json({
      status: "success",
      data: {
        jobId,
        message: "Track conversion has been queued",
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get conversion status
router.get("/status/:jobId", async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = await trackConversionQueue.getJob(jobId);

    if (!job) {
      throw new AppError(404, "Job not found");
    }

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;

    res.json({
      status: "success",
      data: {
        jobId,
        state,
        progress,
        result,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Request audio file conversion
router.post("/convert-audio", async (req, res, next) => {
  try {
    const options = audioFileConversionOptionsSchema.parse(req.body);

    // Check if track exists and get current status
    const track = await prisma.track.findUnique({
      where: { id: options.trackId },
      select: {
        wavConversionStatus: options.format === "wav",
        flacConversionStatus: options.format === "flac",
      },
    });

    if (!track) {
      throw new AppError(404, "Track not found");
    }

    const conversionStatus =
      options.format === "wav"
        ? track.wavConversionStatus
        : track.flacConversionStatus;

    // If conversion is already in progress, return existing status
    if (conversionStatus === AudioFileConversionStatus.IN_PROGRESS) {
      return res.json({
        status: "in_progress",
        message: `${options.format} conversion is already in progress`,
      });
    }

    // Check for existing jobs in the queue
    const activeJobs = await audioFileConversionQueue.getJobs([
      "active",
      "waiting",
    ]);
    const existingJob = activeJobs.find(
      (job) =>
        job.data.trackId === options.trackId &&
        job.data.type === options.type &&
        job.data.format === options.format &&
        job.data.stemId === options.stemId
    );

    if (existingJob) {
      const state = await existingJob.getState();
      return res.json({
        status: "in_progress",
        message: `${options.format} conversion job is already ${
          state === "waiting" ? "queued" : state
        }`,
      });
    }

    const jobId = await queueAudioFileConversion(
      options.trackId,
      options.type,
      options.format,
      options.stemId
    );

    res.json({
      status: "success",
      data: {
        jobId,
        message: `${options.format} conversion has been queued`,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get track audio file conversion status
router.get("/audio-conversion-status/:trackId", async (req, res, next) => {
  try {
    const { trackId } = req.params;
    const { format } = req.query;

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: {
        wavConversionStatus: format === "wav",
        flacConversionStatus: format === "flac",
      },
    });

    if (!track) {
      throw new AppError(404, "Track not found");
    }

    res.json({
      status: "success",
      data: {
        conversionStatus:
          format === "wav"
            ? track.wavConversionStatus
            : track.flacConversionStatus,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get stem audio file conversion status
router.get("/stem/:stemId/audio-conversion-status", async (req, res, next) => {
  try {
    const { stemId } = req.params;
    const { format } = req.query;

    const conversionStatusProperty =
      format === "wav" ? "wavConversionStatus" : "flacConversionStatus";

    const stem = await prisma.stem.findUnique({
      where: { id: stemId },
      select: { [conversionStatusProperty]: true },
    });

    if (!stem) {
      throw new AppError(404, "Stem not found");
    }

    res.json({
      status: "success",
      data: {
        conversionStatus: stem[conversionStatusProperty],
      },
    });
  } catch (error) {
    next(error);
  }
});

// Trigger file cleanup job on demand
router.post("/trigger-cleanup", async (req, res, next) => {
  try {
    const { timeframe } = req.body;

    // Validate timeframe if provided
    if (timeframe !== undefined) {
      const { value, unit } = timeframe;

      if (typeof value !== "number" || value <= 0) {
        throw new AppError(400, "timeframe.value must be a positive number");
      }

      if (!["days", "hours", "minutes", "seconds"].includes(unit)) {
        throw new AppError(
          400,
          "timeframe.unit must be one of: days, hours, minutes, seconds"
        );
      }
    }

    const jobId = await runCleanupJobNow(timeframe);

    res.json({
      status: "success",
      data: {
        jobId,
        message: `File cleanup job has been queued${
          timeframe
            ? ` (cleaning files older than ${timeframe.value} ${timeframe.unit})`
            : ""
        }`,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Queue tracks for deletion
router.post("/tracks/delete", async (req, res, next) => {
  try {
    const { trackIds } = trackDeletionSchema.parse(req.body);

    const jobId = await queueTrackDeletion(trackIds);
    res.status(202).json({ jobId });
  } catch (error) {
    next(error);
  }
});
