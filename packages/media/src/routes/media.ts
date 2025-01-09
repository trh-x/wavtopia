import { Router } from "express";
import { AppError } from "../middleware/errorHandler";
import { uploadHandler } from "../middleware/upload";
import { queueConversion, conversionQueue } from "../services/queue";

export const router = Router();

// Convert audio to WAV format
router.post("/convert-to-wav", uploadHandler, async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError(400, "No file uploaded");
    }

    const jobId = await queueConversion(req.file.path, req.file.originalname);

    res.json({
      status: "success",
      data: {
        jobId,
        message: "File conversion has been queued",
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

    res.json({
      status: "success",
      data: {
        jobId,
        state,
        progress,
      },
    });
  } catch (error) {
    next(error);
  }
});
