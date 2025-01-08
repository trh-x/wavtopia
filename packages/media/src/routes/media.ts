import { Router } from "express";
import { convertToWav } from "../services/converter";
import { AppError } from "../middleware/errorHandler";
import { uploadHandler } from "../middleware/upload";

export const router = Router();

// Convert audio to WAV format
router.post("/convert-to-wav", uploadHandler, async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError(400, "No file uploaded");
    }

    const outputPath = await convertToWav(req.file.path);
    res.json({
      status: "success",
      data: {
        outputPath,
      },
    });
  } catch (error) {
    next(error);
  }
});
