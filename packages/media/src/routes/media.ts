import { Router } from "express";
import { AppError } from "../middleware/errorHandler";
import {
  queueConversion,
  conversionQueue,
  queueWavConversion,
  wavConversionQueue,
} from "../services/queue";
import { z } from "zod";
import { PrismaService, config } from "@wavtopia/core-storage";

const prisma = new PrismaService(config.database).db;

export const router = Router();

const conversionOptionsSchema = z.object({
  trackId: z.string().uuid(),
});

const wavConversionOptionsSchema = z.object({
  trackId: z.string().uuid(),
  type: z.enum(["full", "component"]),
  componentId: z.string().uuid().optional(),
});

// Convert XM file to MP3/FLAC format
router.post("/convert", async (req, res, next) => {
  try {
    // Parse conversion options
    const options = conversionOptionsSchema.parse(req.body);

    const jobId = await queueConversion(options.trackId);

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
    const job = await conversionQueue.getJob(jobId);

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

// Request WAV conversion
router.post("/convert-wav", async (req, res, next) => {
  try {
    const options = wavConversionOptionsSchema.parse(req.body);

    // Check if track exists and get current status
    const track = await prisma.track.findUnique({
      where: { id: options.trackId },
      select: { wavConversionStatus: true },
    });

    if (!track) {
      throw new AppError(404, "Track not found");
    }

    // If conversion is already in progress, return existing status
    if (track.wavConversionStatus === "IN_PROGRESS") {
      return res.json({
        status: "in_progress",
        message: "WAV conversion is already in progress",
      });
    }

    const jobId = await queueWavConversion(
      options.trackId,
      options.type,
      options.componentId
    );

    res.json({
      status: "success",
      data: {
        jobId,
        message: "WAV conversion has been queued",
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get WAV conversion status
router.get("/wav-status/:trackId", async (req, res, next) => {
  try {
    const { trackId } = req.params;

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: { wavConversionStatus: true },
    });

    if (!track) {
      throw new AppError(404, "Track not found");
    }

    res.json({
      status: "success",
      data: {
        conversionStatus: track.wavConversionStatus,
      },
    });
  } catch (error) {
    next(error);
  }
});
