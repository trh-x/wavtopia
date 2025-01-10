import "dotenv/config";
import express from "express";
import { router as mediaRouter } from "./routes/media";
import { errorHandler } from "./middleware/errorHandler";
import { initializeStorage } from "./services/storage";
import { config } from "./config";

const app = express();

// Initialize storage
initializeStorage().catch((error) => {
  console.error("Failed to initialize storage:", error);
  process.exit(1);
});

// Middleware
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/api/media", mediaRouter);

// Error handling
app.use(errorHandler);

app.listen(config.server.port, () => {
  console.log(`Media service listening on port ${config.server.port}`);
});
