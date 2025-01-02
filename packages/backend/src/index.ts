import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { trackRoutes } from "./routes/tracks";
import { errorHandler } from "./middleware/errorHandler";

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
app.use("/api/tracks", trackRoutes);

// Error handling
app.use(errorHandler);

async function main() {
  try {
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
