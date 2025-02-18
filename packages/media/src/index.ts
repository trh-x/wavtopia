import "dotenv/config";
import express from "express";
import { router as mediaRouter } from "./routes/media";
import { errorHandler } from "./middleware/errorHandler";
import { initializeStorage } from "./services/storage";
import { config } from "./config";
import { cleanupAllWorkers } from "./services/queue";

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

// Start server
const server = app.listen(config.server.port, () => {
  console.log(`Media service listening on port ${config.server.port}`);
});

// Set timeout to 5 minutes
server.timeout = 300000;

// Graceful shutdown
async function shutdown() {
  console.log("Shutting down media service...");

  try {
    // Close all queue workers
    await cleanupAllWorkers();
    console.log("Queue workers closed");

    // Close server
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });

    // If server hasn't closed in 10 seconds, force exit
    setTimeout(() => {
      console.error("Could not close server gracefully, forcing shutdown");
      process.exit(1);
    }, 10000);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
