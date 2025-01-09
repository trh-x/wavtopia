import Queue from "bull";
import { convertToWav } from "./converter";

interface ConversionJob {
  inputPath: string;
  originalName: string;
}

// Create a new queue
export const conversionQueue = new Queue<ConversionJob>("audio-conversion", {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
});

// Process jobs
conversionQueue.process(async (job) => {
  console.log(
    `Processing conversion job ${job.id} for file: ${job.data.originalName}`
  );

  try {
    const outputPath = await convertToWav(job.data.inputPath);
    return { outputPath };
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
    throw error;
  }
});

// Add job to queue
export const queueConversion = async (
  inputPath: string,
  originalName: string
) => {
  const job = await conversionQueue.add(
    {
      inputPath,
      originalName,
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    }
  );

  return job.id;
};

// Event handlers for monitoring
conversionQueue.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

conversionQueue.on("failed", (job, error) => {
  console.error(`Job ${job.id} failed:`, error);
});
