import express from "express";
import { router as mediaRouter } from "./routes/media";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const port = process.env.PORT || 3001;

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

app.listen(port, () => {
  console.log(`Media service listening on port ${port}`);
});
