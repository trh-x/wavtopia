import { Router } from "express";
import { AppError } from "../middleware/errorHandler";
import { queueConversion, conversionQueue } from "../services/queue";
import { z } from "zod";

export const router = Router();

const conversionOptionsSchema = z.object({
  trackId: z.string().uuid(),
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
