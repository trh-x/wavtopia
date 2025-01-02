import multer from "multer";
import { AppError } from "./errorHandler";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept .xm and .wav files
    if (file.mimetype === "audio/wav" || file.originalname.endsWith(".xm")) {
      cb(null, true);
    } else {
      cb(new AppError(400, "Only .wav and .xm files are allowed"));
    }
  },
});

export const uploadTrackFiles = upload.fields([
  { name: "original", maxCount: 1 },
  { name: "components", maxCount: 10 },
  { name: "coverArt", maxCount: 1 },
]);
