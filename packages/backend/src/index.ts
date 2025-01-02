import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { trackRoutes } from "./routes/tracks";
import { authRoutes } from "./routes/auth";
import { errorHandler } from "./middleware/errorHandler";
import { initializeStorage } from "./services/storage";

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/tracks", trackRoutes);

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

    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
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
