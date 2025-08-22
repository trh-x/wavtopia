import { Job, Worker } from "bullmq";
import { convertWAVToMP3 } from "../mp3-converter";
import { generateWaveformData } from "../waveform";
import { convertAudioToFormat } from "../audio-file-converter";
import { getLocalFile, uploadFile } from "../storage";
import {
  updateUserStorage,
  deleteLocalFile,
  config,
} from "@wavtopia/core-storage";
import {
  createQueue,
  prisma,
  setupQueueMonitoring,
  standardJobOptions,
} from "./common";

interface StemProcessingJob {
  stemId: string;
  stemFileUrl: string;
  stemFileName: string;
  trackId: string;
  userId: string;
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

// Utility function to convert any audio format to WAV using FFmpeg
async function convertAudioToWAV(
  audioBuffer: Buffer,
  sourceFormat: string
): Promise<Buffer> {
  const { promisify } = require("util");
  const { exec } = require("child_process");
  const { writeFile, mkdtemp, rm, readFile } = require("fs/promises");
  const { join } = require("path");
  const { tmpdir } = require("os");

  const execAsync = promisify(exec);

  try {
    // Create temporary directory
    const tempDir = await mkdtemp(join(tmpdir(), "wavtopia-audio-"));
    const inputPath = join(tempDir, `input.${sourceFormat}`);
    const outputPath = join(tempDir, "output.wav");

    try {
      // Write audio file to temp directory
      await writeFile(inputPath, audioBuffer);

      // Convert to WAV using FFmpeg
      const { stderr } = await execAsync(
        `ffmpeg -loglevel error -i "${inputPath}" -c:a pcm_s16le "${outputPath}"`
      );

      if (stderr) {
        console.error(
          `${sourceFormat.toUpperCase()} to WAV conversion stderr:`,
          stderr
        );
      }

      // Read the WAV file
      const wavBuffer = await readFile(outputPath);
      return wavBuffer;
    } finally {
      // Clean up temporary directory
      await rm(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error(
      `Error converting ${sourceFormat.toUpperCase()} to WAV:`,
      error
    );
    throw new Error(`Failed to convert ${sourceFormat.toUpperCase()} to WAV`);
  }
}

async function stemProcessingProcessor(job: Job<StemProcessingJob>) {
  const { stemId, stemFileUrl, stemFileName, trackId, userId } = job.data;

  console.log(
    `Processing stem file ${job.id} for stem: ${stemId} (track: ${trackId})`
  );

  try {
    // Get the stem file
    console.log(`Attempting to read stem file from: ${stemFileUrl}`);
    const stemFile = await getLocalFile(stemFileUrl);

    // Detect file format and convert to WAV if needed for waveform generation
    let wavBuffer: Buffer;
    const fileExtension = stemFileName.toLowerCase().split(".").pop();

    console.log(`Processing ${fileExtension} file for stem: ${stemId}`);

    if (fileExtension === "wav") {
      wavBuffer = stemFile.buffer;
    } else if (fileExtension === "flac") {
      console.log(`Converting FLAC to WAV for waveform generation: ${stemId}`);
      wavBuffer = await convertAudioToFormat(stemFile.buffer, "wav");
    } else {
      // For other formats (like MP3), we'll use FFmpeg to convert to WAV
      console.log(
        `Converting ${fileExtension} to WAV for processing: ${stemId}`
      );
      wavBuffer = await convertAudioToWAV(
        stemFile.buffer,
        fileExtension || "unknown"
      );
    }

    // Generate waveform data from WAV buffer
    console.log(`Generating waveform data for stem: ${stemId}`);
    const waveformResult = await generateWaveformData(wavBuffer);
    console.log(`Waveform data generated for stem: ${stemId}`);

    // Convert to MP3 from WAV buffer
    console.log(`Converting stem to MP3: ${stemId}`);
    const kbps = 192; // TODO: Make this configurable
    const mp3Buffer = await convertWAVToMP3(wavBuffer, kbps);
    console.log(`MP3 conversion complete for stem: ${stemId}`);

    // Upload MP3 file
    const stemName = stemFileName.replace(/\.[^/.]+$/, ""); // Remove extension
    const sanitizedName = stemName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const mp3Url = await uploadMp3File(mp3Buffer, sanitizedName, "stems/");
    console.log(`MP3 uploaded for stem: ${stemId}`);

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

    // Update the stem in the database
    console.log(`Updating stem ${stemId} in database with:`, {
      mp3Url,
      mp3SizeBytes: mp3Buffer.length,
      waveformDataLength: waveformResult.peaks.length,
      duration: waveformResult.duration,
      waveformDataSample: waveformResult.peaks.slice(0, 10), // First 10 values for debugging
    });

    await prisma.stem.update({
      where: { id: stemId },
      data: {
        mp3Url,
        mp3SizeBytes: mp3Buffer.length,
        waveformData: waveformResult.peaks,
        duration: waveformResult.duration,
        // Reset conversion status when file is processed
        wavUrl: null,
        flacUrl: null,
        wavConversionStatus: "NOT_STARTED",
        flacConversionStatus: "NOT_STARTED",
      },
    });

    console.log(`Database update completed for stem: ${stemId}`);

    // Update user storage with the actual duration
    await updateUserStorage(
      {
        userId,
        secondsChange: waveformResult.duration,
      },
      prisma
    );

    console.log(`Stem processing completed for: ${stemId}`);

    return {
      stemId,
      mp3Url,
      mp3SizeBytes: mp3Buffer.length,
      waveformData: waveformResult.peaks,
      duration: waveformResult.duration,
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
  userId: string
) => {
  const job = await stemProcessingQueue.add(
    "process-stem",
    {
      stemId,
      stemFileUrl,
      stemFileName,
      trackId,
      userId,
    },
    standardJobOptions
  );

  return job.id;
};

// Cleanup function for graceful shutdown
export async function cleanup(): Promise<void> {
  await worker.close();
}
