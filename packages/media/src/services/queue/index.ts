import { cleanup as cleanupTrackConversion } from "./track-conversion-queue";
import { cleanup as cleanupAudioFileConversion } from "./audio-file-conversion-queue";

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

// Cleanup function for graceful shutdown of all workers
export async function cleanupAllWorkers(): Promise<void> {
  await Promise.all([cleanupAudioFileConversion(), cleanupTrackConversion()]);
}
