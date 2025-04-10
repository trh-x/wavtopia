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
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept .xm, .it, and .mod files (case-insensitive) and images for cover art
    if (
      file.originalname.toLowerCase().endsWith(".xm") ||
      file.originalname.toLowerCase().endsWith(".it") ||
      file.originalname.toLowerCase().endsWith(".mod") ||
      file.mimetype.startsWith("image/")
    ) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          400,
          "Only .xm, .it, and .mod files and images are allowed"
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

  if (req.user.isOverStorageQuota) {
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
]);
