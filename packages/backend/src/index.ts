import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { trackRoutes } from "./routes/track";
import { tracksRoutes } from "./routes/tracks";
import { authRoutes } from "./routes/auth";
import { errorHandler } from "./middleware/errorHandler";
import { initializeStorage } from "./services/storage";
import config from "./config";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.database.url,
    },
  },
});

const app = express();

// Increase the request size limit
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(cors());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/track", trackRoutes);
app.use("/api/tracks", tracksRoutes);

// Error handling
app.use(errorHandler);

async function main() {
  try {
    // Initialize storage
    await initializeStorage();
    console.log("Storage initialized");

    // Connect to database
    await prisma.$connect();
    console.log("Connected to database");

    const server = app.listen(config.server.port, () => {
      console.log(`Server running at http://localhost:${config.server.port}`);
    });

    // Set timeout to 5 minutes
    server.timeout = 300000;
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

export { app };
