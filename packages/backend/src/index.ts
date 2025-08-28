import "dotenv/config";
import express from "express";
import cors from "cors";
import { prismaService } from "./lib/prisma";
import { errorHandler } from "./middleware/errorHandler";
import { authRoutes } from "./routes/auth";
import { trackRoutes } from "./routes/track";
import { tracksRoutes } from "./routes/tracks";
import { initializeStorage } from "./services/storage";
import { config } from "./config";
import adminRoutes from "./routes/admin";
import { notificationRoutes } from "./routes/notifications";
import licenseRoutes from "./routes/licenses";
import storageRoutes from "./routes/storage";

const app = express();

// Middleware
app.use(express.json({ limit: "1mb" })); // Default limit is sufficient for track metadata
app.use(cors());

// Health check endpoint
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/track", trackRoutes);
app.use("/api/tracks", tracksRoutes);
app.use("/api/admin", adminRoutes);
// TODO: notifications can go under /api/user
app.use("/api/notifications", notificationRoutes);
// TODO: licenses can go under /api/settings
app.use("/api/licenses", licenseRoutes);
app.use("/api/storage", storageRoutes);

// Error handling
app.use(errorHandler);

let server: ReturnType<typeof app.listen>;

async function shutdown() {
  console.log("Shutting down backend service...");

  try {
    // Close server first to stop accepting new requests
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log("Server closed");
    }

    // Disconnect from database
    await prismaService.disconnect();
    console.log("Database disconnected");

    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

async function main() {
  try {
    // Initialize storage
    await initializeStorage();
    console.log("Storage initialized");

    // Connect to database
    await prismaService.connect();
    console.log("Connected to database");

    server = app.listen(config.server.port, () => {
      console.log(`Server running at http://localhost:${config.server.port}`);
    });

    // Set timeout to 5 minutes
    server.timeout = 300000;
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main().catch(console.error);

export { app };
