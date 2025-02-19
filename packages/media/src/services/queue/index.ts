import { cleanup as cleanupTrackConversion } from "./track-conversion-queue";
import { cleanup as cleanupAudioFileConversion } from "./audio-file-conversion-queue";
import {
  cleanup as cleanupFileCleanup,
  scheduleCleanupJob,
} from "./file-cleanup-queue";

export {
  queueTrackConversion,
  trackConversionQueue,
  worker as trackConversionWorker,
} from "./track-conversion-queue";

export {
  queueAudioFileConversion,
  audioFileConversionQueue,
  worker as audioFileConversionWorker,
} from "./audio-file-conversion-queue";

export {
  fileCleanupQueue,
  worker as fileCleanupWorker,
} from "./file-cleanup-queue";

// Initialize scheduled jobs
export async function initializeScheduledJobs(): Promise<void> {
  await scheduleCleanupJob();
}

// Cleanup function for graceful shutdown of all workers
export async function cleanupAllWorkers(): Promise<void> {
  await Promise.all([
    cleanupAudioFileConversion(),
    cleanupTrackConversion(),
    cleanupFileCleanup(),
  ]);
}
