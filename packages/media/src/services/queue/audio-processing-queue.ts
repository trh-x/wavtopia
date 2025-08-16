import { Job, Worker } from "bullmq";
import {
  SourceFormat,
  TrackStatus,
  deleteLocalFile,
} from "@wavtopia/core-storage";
import {
  createQueue,
  prisma,
  setupQueueMonitoring,
  standardJobOptions,
} from "./common";
import { uploadFile, getLocalFile } from "../storage";
import { convertWAVToMP3 } from "../mp3-converter";
import { generateWaveformData } from "../waveform";
import { AppError } from "../../middleware/errorHandler";

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

// Create queue
export const audioProcessingQueue =
  createQueue<AudioProcessingJob>("audio-processing");

// Set up monitoring
setupQueueMonitoring(audioProcessingQueue, "Audio Processing");

interface AudioProcessingJob {
  trackId: string;
}

// Queue a track for audio processing
export async function queueAudioProcessing(trackId: string): Promise<string> {
  const job = await audioProcessingQueue.add(
    "process-audio",
    { trackId },
    standardJobOptions
  );
  return job.id!;
}

// Process audio file (WAV/FLAC) - generates MP3 and waveform data
async function audioProcessingProcessor(job: Job<AudioProcessingJob>) {
  console.log(`Processing audio job ${job.id} for track: ${job.data.trackId}`);

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

    // Check if this is actually an audio file
    if (
      track.originalFormat !== SourceFormat.WAV &&
      track.originalFormat !== SourceFormat.FLAC
    ) {
      throw new Error(`Track ${trackId} is not a WAV or FLAC file`);
    }

    const originalFile = await getLocalFile(track.originalUrl);
    const originalName = track.title.replace(/[^a-zA-Z0-9._-]/g, "_");

    // Upload original file to permanent storage
    console.log("Uploading original file...");
    const originalUrl = await uploadFile(originalFile, "originals/");
    await deleteLocalFile(track.originalUrl);
    console.log("Original file uploaded:", originalUrl);

    // Upload cover art if provided
    let coverArtUrl: string | undefined;
    if (track.coverArt) {
      const coverArtFile = await getLocalFile(track.coverArt);
      console.log("Uploading cover art...");
      coverArtUrl = await uploadFile(coverArtFile, "covers/");
      await deleteLocalFile(track.coverArt);
      console.log("Cover art uploaded:", coverArtUrl);
    }

    if (user.isOverQuota) {
      console.warn(
        `User ${user.id} is over quota but processing uploaded audio file anyway...`
      );
    }

    // For audio files, we process them as a single "full track"
    // We don't extract stems since they weren't separated at upload time
    console.log("Processing audio file...");

    let audioBuffer: Buffer;
    if (track.originalFormat === SourceFormat.WAV) {
      // WAV file can be used directly
      audioBuffer = originalFile.buffer;
    } else {
      // FLAC file - for now, we'll process it directly as the convertWAVToMP3
      // function might handle FLAC input too (depending on ffmpeg capabilities)
      // TODO: Implement proper FLAC to WAV conversion if needed
      audioBuffer = originalFile.buffer;
    }

    // Generate MP3 from the audio file
    const kbps = 320; // High quality for uploaded audio
    const mp3Buffer = await convertWAVToMP3(audioBuffer, kbps);

    // Generate waveform data
    const waveformResult = await generateWaveformData(audioBuffer);
    console.log("Generated waveform data");

    // Upload MP3
    const mp3Url = await uploadMp3File(
      mp3Buffer,
      `${originalName}_full`,
      "tracks/"
    );
    console.log("Full track MP3 uploaded");

    // Update track in database
    const updatedTrack = await prisma.track.update({
      where: { id: trackId },
      data: {
        originalUrl,
        coverArt: coverArtUrl,
        fullTrackMp3Url: mp3Url,
        mp3SizeBytes: mp3Buffer.length,
        waveformData: waveformResult.peaks,
        duration: waveformResult.duration,
        status: TrackStatus.ACTIVE,
      },
    });

    console.log(`Audio processing completed for track ${trackId}`);

    // Note: For uploaded audio files, we don't create individual stems
    // since the user uploaded the full track, not separated stems.
    // If users want to upload stems separately, that would be a different flow.

    return {
      trackId,
      status: "completed",
      mp3Url,
      waveformData: waveformResult.peaks,
      duration: waveformResult.duration,
    };
  } catch (error) {
    console.error(
      `Error processing audio for track ${job.data.trackId}:`,
      error
    );

    // Update track status to indicate failure
    try {
      await prisma.track.update({
        where: { id: job.data.trackId },
        data: { status: TrackStatus.ACTIVE }, // Still mark as active, just without processed files
      });
    } catch (dbError) {
      console.error("Failed to update track status after error:", dbError);
    }

    throw error;
  }
}

// Worker
export const worker = new Worker("audio-processing", audioProcessingProcessor, {
  connection: audioProcessingQueue.opts.connection,
  concurrency: 2,
});

worker.on("completed", (job) => {
  console.log(`Audio processing job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Audio processing job ${job?.id} failed:`, err);
});

// Cleanup function
export async function cleanup(): Promise<void> {
  await worker.close();
  await audioProcessingQueue.close();
}
