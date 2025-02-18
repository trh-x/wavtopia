import { Queue, Job, QueueEvents } from "bullmq";
import { PrismaService, config } from "@wavtopia/core-storage";

export const prisma = new PrismaService(config.database).db;

// Standard job options for all queues
export const standardJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 1000,
  },
};

// Utility function to create a queue with standard configuration
export function createQueue<T>(name: string): Queue<T> {
  return new Queue<T>(name, {
    connection: config.redis,
  });
}

// Utility function to set up queue monitoring
export function setupQueueMonitoring<T>(queue: Queue<T>, name: string): void {
  const queueEvents = new QueueEvents(queue.name, {
    connection: config.redis,
  });

  queueEvents.on("completed", ({ jobId }) => {
    console.log(`${name} job ${jobId} completed successfully`);
  });

  queueEvents.on("failed", ({ jobId, failedReason }) => {
    console.error(`${name} job ${jobId} failed:`, failedReason);
  });
}
