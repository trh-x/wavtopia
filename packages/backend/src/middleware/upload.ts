import multer from "multer";
import { AppError } from "./errorHandler";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept .xm files (case-insensitive) and images for cover art
    if (
      file.originalname.toLowerCase().endsWith(".xm") ||
      file.mimetype.startsWith("image/")
    ) {
      cb(null, true);
    } else {
      cb(new AppError(400, "Only .xm files and images are allowed"));
    }
  },
});

export const uploadTrackFiles = upload.fields([
  { name: "original", maxCount: 1 },
  { name: "coverArt", maxCount: 1 },
]);
