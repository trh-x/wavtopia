import { Job, Worker } from "bullmq";
import { convertModuleToWAV, ConvertedStem } from "../module-converter";
import { convertWAVToMP3 } from "../../services/mp3-converter";
import { generateWaveformData } from "../../services/waveform";
import { StorageFile, config, updateUserStorage } from "@wavtopia/core-storage";
import { uploadFile, deleteFile, getLocalFile } from "../../services/storage";
import {
  createQueue,
  prisma,
  setupQueueMonitoring,
  standardJobOptions,
} from "./common";

interface TrackConversionJob {
  trackId: string;
}

// Create queue
export const trackConversionQueue =
  createQueue<TrackConversionJob>("audio-conversion");

// Set up monitoring
setupQueueMonitoring(trackConversionQueue, "Conversion");

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
    } as StorageFile,
    directory
  );
}

// Utility function to clean up uploaded files
async function cleanupUploadedFiles(
  files: (string | undefined)[]
): Promise<void> {
  console.log("Cleaning up uploaded files...");
  try {
    await Promise.all(
      files.filter((f): f is string => !!f).map((file) => deleteFile(file))
    );
    console.log("Cleanup completed");
  } catch (cleanupError) {
    console.error("Error during cleanup:", cleanupError);
  }
}

// Utility function to check for disk space error
function isDiskSpaceError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "53100"
  );
}

// Utility function to process a stem
async function processStem(
  stem: ConvertedStem,
  originalName: string,
  index: number,
  totalCount: number
): Promise<{
  name: string;
  type: string;
  index: number;
  mp3Url: string;
  mp3SizeBytes: number;
  waveformData: number[];
  duration: number;
}> {
  console.log(`Processing stem ${index + 1}/${totalCount}: ${stem.name}`);

  // TODO: Make this configurable
  const kbps = 192;
  const mp3Buffer = await convertWAVToMP3(stem.buffer, kbps);
  const stemName = `${originalName}_${stem.name.replace(/[^a-z0-9]/gi, "_")}`;

  const waveformResult = await generateWaveformData(stem.buffer);
  console.log(`Generated waveform data for stem: ${stem.name}`);

  const mp3Url = await uploadMp3File(mp3Buffer, stemName, "stems/");

  console.log(`Stem ${stem.name} MP3 uploaded`);
  return {
    name: stem.name,
    type: stem.type,
    index,
    mp3Url,
    mp3SizeBytes: mp3Buffer.length,
    waveformData: waveformResult.peaks,
    duration: waveformResult.duration,
  };
}

// Utility function to process full track
async function processFullTrack(
  buffer: Buffer,
  originalName: string
): Promise<{
  mp3Url: string;
  mp3SizeBytes: number;
  waveformData: number[];
  duration: number;
}> {
  // Generate waveform data for full track
  console.log("Generating waveform data for full track...");
  const waveformResult = await generateWaveformData(buffer);
  console.log("Full track waveform data generated");

  // Convert full track to MP3
  console.log("Converting full track to MP3...");

  // TODO: Make this configurable
  const kbps = 320;
  const mp3Buffer = await convertWAVToMP3(buffer, kbps);
  console.log("Full track MP3 conversion complete");

  // Upload MP3 file
  console.log("Uploading full track MP3 file...");
  const mp3Url = await uploadMp3File(
    mp3Buffer,
    `${originalName}_full`,
    "tracks/"
  );
  console.log("Full track MP3 uploaded");

  return {
    mp3Url,
    mp3SizeBytes: mp3Buffer.length,
    waveformData: waveformResult.peaks,
    duration: waveformResult.duration,
  };
}

async function trackConversionProcessor(job: Job<TrackConversionJob>) {
  console.log(
    `Processing conversion job ${job.id} for track: ${job.data.trackId}`
  );

  try {
    const { trackId } = job.data;

    // First check if track exists
    const track = await prisma.track.findUnique({
      where: { id: trackId },
    });

    if (!track) {
      throw new Error(`Track not found: ${trackId}`);
    }

    if (!track.originalUrl) {
      throw new Error(`Track ${trackId} has no original file URL`);
    }

    const user = await prisma.user.findUnique({
      where: { id: track.userId },
    });

    if (!user) {
      throw new Error(`User not found: ${track.userId}`);
    }

    if (user.isOverStorageQuota) {
      throw new Error(`User ${track.userId} has exceeded their storage quota`);
    }

    const originalFile = await getLocalFile(track.originalUrl);
    // TODO: Retain the original file name from the point of upload
    const originalName = track.title.replace(/[^a-zA-Z0-9._-]/g, "_");
    // const originalName = track.originalUrl.replace(/\.[^/.]+$/, "");

    // Upload original file
    console.log("Uploading original file...");
    const originalUrl = await uploadFile(originalFile, "originals/");
    console.log("Original file uploaded:", originalUrl);

    // Upload cover art if provided
    let coverArtUrl: string | undefined;
    if (track.coverArt) {
      const coverArtFile = await getLocalFile(track.coverArt);
      console.log("Uploading cover art...");
      coverArtUrl = await uploadFile(coverArtFile, "covers/");
      console.log("Cover art uploaded:", coverArtUrl);
    }

    // Convert module to WAV
    console.log("Converting module to WAV...");
    const { fullTrackWavBuffer, stems } = await convertModuleToWAV(
      originalFile.buffer,
      track.originalFormat
    );
    console.log("Module conversion complete. Stems:", stems.length);

    const {
      mp3Url: fullTrackMp3Url,
      mp3SizeBytes,
      waveformData,
      duration,
    } = await processFullTrack(fullTrackWavBuffer, originalName);

    // Convert and upload stem files
    console.log("Processing stems...");
    const stemUploads = await Promise.all(
      stems.map((stem, index) =>
        processStem(stem, originalName, index, stems.length)
      )
    );

    // Update database record
    console.log("Updating database record...");
    try {
      // Update track and update storage usage in a transaction
      await prisma.$transaction(async (tx) => {
        const track = await prisma.track.update({
          where: { id: trackId },
          data: {
            originalUrl,
            fullTrackMp3Url,
            waveformData,
            duration,
            coverArt: coverArtUrl,
            mp3SizeBytes,
            stems: {
              create: stemUploads,
            },
          },
        });

        console.log("Track updated successfully:", track.id);

        // Update storage usage and get quota warning
        const totalBytesToAdd =
          stemUploads.reduce((acc, stem) => acc + stem.mp3SizeBytes, 0) +
          mp3SizeBytes;
        const { notification } = await updateUserStorage(
          {
            bytesToAdd: totalBytesToAdd,
            userId: track.userId,
          },
          tx
        );

        if (notification) {
          console.warn(
            `User ${track.userId} has exceeded their storage quota. Quota warning: ${notification.message}`
          );
        }
      });
    } catch (dbError) {
      console.error("Database error during track creation:", dbError);

      // Clean up uploaded files if database operation fails
      await cleanupUploadedFiles([
        originalUrl,
        fullTrackMp3Url,
        coverArtUrl,
        ...stemUploads.map((stem) => stem.mp3Url),
      ]);

      if (isDiskSpaceError(dbError)) {
        console.error("Insufficient storage space.");
      }
      throw dbError;
    }
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
    throw error;
  }
}

// Process track conversion jobs
export const worker = new Worker<TrackConversionJob>(
  "audio-conversion",
  trackConversionProcessor,
  {
    connection: config.redis,
  }
);

// Cleanup function for graceful shutdown
export async function cleanup(): Promise<void> {
  await worker.close();
}

// Add job to queue
export const queueTrackConversion = async (trackId: string) => {
  const job = await trackConversionQueue.add(
    "convert-track",
    { trackId },
    standardJobOptions
  );

  return job.id;
};
