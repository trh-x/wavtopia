import { Job, Worker } from "bullmq";
import { convertWAVToMP3 } from "../mp3-converter";
import { generateWaveformData } from "../waveform";
import { convertAudioToFormat } from "../audio-file-converter";
import { deleteFile, getLocalFile, uploadFile } from "../storage";
import {
  updateUserStorage,
  deleteLocalFile,
  config,
  AudioFileConversionStatus,
  SourceFormat,
  Stem,
} from "@wavtopia/core-storage";
import {
  createQueue,
  prisma,
  setupQueueMonitoring,
  standardJobOptions,
} from "./common";
import { queueTrackRegeneration } from "./track-regeneration-queue";

interface StemProcessingJob {
  stemId: string;
  stemFileUrl: string;
  stemFileName: string;
  trackId: string;
  userId: string;
  operation: "add_stem" | "replace_stem";
}

// Create queue
export const stemProcessingQueue =
  createQueue<StemProcessingJob>("stem-processing");

// Utility function to upload an MP3 file
async function uploadMp3File(
  buffer: Buffer,
  filename: string,
  directory: string
): Promise<string> {
  return uploadFile(
    {
      buffer,
      originalname: `${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}.mp3`,
      mimetype: "audio/mpeg",
      size: buffer.length,
    },
    directory
  );
}

async function uploadFlacFile(
  buffer: Buffer,
  filename: string,
  directory: string
): Promise<string> {
  return uploadFile(
    {
      buffer,
      originalname: `${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}.flac`,
      mimetype: "audio/flac",
      size: buffer.length,
    },
    directory
  );
}

async function stemProcessingProcessor(job: Job<StemProcessingJob>) {
  const { stemId, stemFileUrl, stemFileName, trackId, userId, operation } =
    job.data;

  console.log(
    `Processing stem file ${job.id} for stem: ${stemId} (track: ${trackId})`
  );

  try {
    // Get the stem file
    console.log(`Attempting to read stem file from: ${stemFileUrl}`);
    const stemFile = await getLocalFile(stemFileUrl);

    // Detect file format and convert to WAV for waveform generation
    // or FLAC for storage as needed
    let wavBuffer: Buffer;
    let flacBuffer: Buffer;
    const fileExtension = stemFileName.toLowerCase().split(".").pop();

    console.log(`Processing ${fileExtension} file for stem: ${stemId}`);

    if (fileExtension === "wav") {
      wavBuffer = stemFile.buffer;
      flacBuffer = await convertAudioToFormat(stemFile.buffer, "flac");
    } else if (fileExtension === "flac") {
      flacBuffer = stemFile.buffer;
      wavBuffer = await convertAudioToFormat(stemFile.buffer, "wav");
    } else {
      throw new Error(`Unsupported file format: ${fileExtension}`);
    }

    // Generate waveform data from WAV buffer
    console.log(`Generating waveform data for stem: ${stemId}`);
    const waveformResult = await generateWaveformData(wavBuffer);
    console.log(`Waveform data generated for stem: ${stemId}`);

    // Convert to MP3 from WAV buffer
    console.log(`Converting stem to MP3: ${stemId}`);
    const kbps = 192; // TODO: Make this configurable
    const mp3Buffer = await convertWAVToMP3(flacBuffer, kbps);
    console.log(`MP3 conversion complete for stem: ${stemId}`);

    // Upload MP3 file
    const stemName = stemFileName.replace(/\.[^/.]+$/, ""); // Remove extension
    const sanitizedName = stemName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const mp3Url = await uploadMp3File(mp3Buffer, sanitizedName, "stems/");
    console.log(`MP3 uploaded for stem: ${stemId}`);

    // Upload FLAC file
    const flacUrl = await uploadFlacFile(flacBuffer, sanitizedName, "stems/");
    console.log(`FLAC uploaded for stem: ${stemId}`);

    // Delete the local file only after successful processing
    try {
      await deleteLocalFile(stemFileUrl);
      console.log(`Local file deleted for stem: ${stemId}`);
    } catch (deleteError) {
      console.warn(
        `Failed to delete local file for stem ${stemId}, but processing was successful:`,
        deleteError
      );
    }

    // Retrieve the current state of the stem, in order to delete its audio files after it has been updated
    const prevStem = await prisma.stem.findUnique({
      where: { id: stemId },
    });

    // Update the stem in the database
    console.log(`Updating stem ${stemId} in database with:`, {
      mp3Url,
      mp3SizeBytes: mp3Buffer.length,
      waveformDataLength: waveformResult.peaks.length,
      duration: waveformResult.duration,
      waveformDataSample: waveformResult.peaks.slice(0, 10), // First 10 values for debugging
    });

    let secondsChange = 0;

    if (operation === "add_stem") {
      secondsChange = waveformResult.duration;
    } else if (operation === "replace_stem") {
      const stem = await prisma.stem.findUnique({
        where: { id: stemId },
      });
      if (!stem) {
        throw new Error(`Stem ${stemId} not found`);
      }
      secondsChange = waveformResult.duration - (stem.duration || 0);
    }

    await prisma.stem.update({
      where: { id: stemId },
      data: {
        mp3Url,
        wavSizeBytes: null,
        mp3SizeBytes: mp3Buffer.length,
        flacSizeBytes: flacBuffer.length,
        waveformData: waveformResult.peaks,
        duration: waveformResult.duration,
        isFlacSource: true,
        wavUrl: null,
        flacUrl,
        // Reset conversion status and timestamps when file is processed
        wavConversionStatus: AudioFileConversionStatus.NOT_STARTED,
        flacConversionStatus: AudioFileConversionStatus.NOT_STARTED,
        wavCreatedAt: null,
        flacCreatedAt: new Date(),
        wavLastRequestedAt: null,
        flacLastRequestedAt: null,
      },
    });

    console.log(`Database update completed for stem: ${stemId}`);

    if (secondsChange > 0) {
      // Update user storage with the actual duration
      await updateUserStorage(
        {
          userId,
          secondsChange,
        },
        prisma
      );
    }

    // Delete the stem's previous audio files
    if (prevStem) {
      [prevStem.mp3Url, prevStem.flacUrl, prevStem.wavUrl].forEach(
        async (url) => {
          if (url) {
            try {
              await deleteFile(url);
            } catch (error) {
              console.error(
                `Error deleting previous stem audio file ${url} for stem ${stemId}:`,
                error
              );
            }
          }
        }
      );
    }

    console.log(`Stem processing completed for: ${stemId}`);

    // Queue track regeneration to regenerate the track with the new stem
    const jobId = await queueTrackRegeneration(
      trackId,
      operation === "add_stem" ? "stem_added" : "stem_updated"
    );

    return {
      stemId,
      mp3Url,
      mp3SizeBytes: mp3Buffer.length,
      waveformData: waveformResult.peaks,
      duration: waveformResult.duration,
      trackRegenerationJobId: jobId,
    };
  } catch (error) {
    console.error(`Error processing stem ${stemId}:`, error);

    // Try to clean up the local file even if processing failed, but don't fail if file doesn't exist
    try {
      await deleteLocalFile(stemFileUrl);
      console.log(
        `Cleaned up local file for failed stem processing: ${stemId}`
      );
    } catch (cleanupError) {
      // Only log as warning if it's not a "file not found" error
      if (
        cleanupError &&
        typeof cleanupError === "object" &&
        "code" in cleanupError &&
        cleanupError.code !== "ENOENT"
      ) {
        console.error(
          `Failed to cleanup local file for stem ${stemId}:`,
          cleanupError
        );
      } else {
        console.warn(`Local file already deleted for stem ${stemId}`);
      }
    }

    throw error;
  }
}

// Create worker
export const worker = new Worker("stem-processing", stemProcessingProcessor, {
  connection: config.redis,
  concurrency: 2, // Process up to 2 stems concurrently
});

// Setup monitoring
setupQueueMonitoring(stemProcessingQueue, "Stem Processing");

// Export queue function
export const queueStemProcessing = async (
  stemId: string,
  stemFileUrl: string,
  stemFileName: string,
  trackId: string,
  userId: string,
  operation: "add_stem" | "replace_stem"
) => {
  const job = await stemProcessingQueue.add(
    "process-stem",
    {
      stemId,
      stemFileUrl,
      stemFileName,
      trackId,
      userId,
      operation,
    },
    standardJobOptions
  );

  return job.id;
};

// Cleanup function for graceful shutdown
export async function cleanup(): Promise<void> {
  await worker.close();
}
