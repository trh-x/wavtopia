import Queue, { Job } from "bull";
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
export function createQueue<T>(name: string): Queue.Queue<T> {
  return new Queue<T>(name, {
    redis: config.redis,
  });
}

// Utility function to set up queue monitoring
export function setupQueueMonitoring<T>(
  queue: Queue.Queue<T>,
  name: string
): void {
  queue.on("completed", (job: Job<T>) => {
    console.log(`${name} job ${job.id} completed successfully`);
  });

  queue.on("failed", (job: Job<T>, error: Error) => {
    console.error(`${name} job ${job.id} failed:`, error);
  });
}
