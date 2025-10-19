import multer from "multer";
import { AppError } from "./errorHandler";
import path from "path";
import { Request, Response, NextFunction } from "express";

// Configure multer for disk storage
const storage = multer.diskStorage({
  // TODO: Specify the destination in the config
  destination: "/tmp/uploads",
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for large audio files
  },
  fileFilter: (req, file, cb) => {
    // Accept .xm, .it, .s3m, .mod, .wav, and .flac files (case-insensitive) and images for cover art
    if (
      file.originalname.toLowerCase().endsWith(".xm") ||
      file.originalname.toLowerCase().endsWith(".it") ||
      file.originalname.toLowerCase().endsWith(".s3m") ||
      file.originalname.toLowerCase().endsWith(".mod") ||
      file.originalname.toLowerCase().endsWith(".wav") ||
      file.originalname.toLowerCase().endsWith(".flac") ||
      file.mimetype.startsWith("image/")
    ) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          400,
          "Only .xm, .it, .s3m, .mod, .wav, .flac files and images are allowed"
        )
      );
    }
  },
});

// Middleware to check if user is over quota before allowing new uploads
export function checkStorageQuota(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user?.id) {
    return next(new AppError(401, "Authentication required"));
  }

  if (req.user.isOverQuota) {
    return next(
      new AppError(
        413,
        "You have exceeded your storage quota. Please free up some space before uploading more."
      )
    );
  }

  next();
}

export const uploadTrackFiles = upload.fields([
  { name: "original", maxCount: 1 },
  { name: "coverArt", maxCount: 1 },
  { name: "stems", maxCount: 20 }, // Allow up to 20 stem files
]);

export const uploadAudioFile = upload.single("audioFile");
