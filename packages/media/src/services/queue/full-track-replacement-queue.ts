import { Job, Worker } from "bullmq";
import {
  AudioFileConversionStatus,
  Track,
  TrackStatus,
  deleteLocalFile,
} from "@wavtopia/core-storage";
import {
  createQueue,
  prisma,
  setupQueueMonitoring,
  standardJobOptions,
} from "./common";
import { uploadFile, getLocalFile, deleteFile } from "../storage";
import { convertWAVToMP3 } from "../mp3-converter";
import { generateWaveformData } from "../waveform";
import { convertAudioToFormat } from "../audio-file-converter";
import {
  checkUserHasCapacity,
  updateUserStorage,
} from "@wavtopia/core-storage";

// Utility function to upload an MP3 file
// TODO: DRY this with duplicate functions in codebase
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

// Utility function to upload a FLAC file
// TODO: DRY this with duplicate functions in codebase
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

// TODO: DRY this with duplicate functions in codebase
function isAllowedAudioFormat(format: string | undefined): boolean {
  if (format === undefined) {
    return false;
  }
  return format === "wav" || format === "flac";
}

// Create queue
export const fullTrackReplacementQueue = createQueue<FullTrackReplacementJob>(
  "full-track-replacement"
);

// Set up monitoring
setupQueueMonitoring(fullTrackReplacementQueue, "Full Track Replacement");

interface StemFileData {
  url: string;
  size: number;
  originalName: string;
  metadata: {
    name: string;
    type: string;
  };
}

interface FullTrackReplacementJob {
  trackId: string;
  audioFileUrl: string;
}

// Queue a track for audio processing
export async function queueFullTrackReplacement(
  trackId: string,
  audioFileUrl: string
): Promise<string> {
  const job = await fullTrackReplacementQueue.add(
    "replace-full-track",
    { trackId, audioFileUrl },
    standardJobOptions
  );
  return job.id!;
}

// Process audio file (WAV/FLAC) - generates MP3 and waveform data
async function fullTrackReplacementProcessor(
  job: Job<FullTrackReplacementJob>
) {
  console.log(`Processing audio job ${job.id} for track: ${job.data.trackId}`);

  try {
    const { trackId, audioFileUrl } = job.data;

    // First check if track exists
    const track = await prisma.track.findUnique({
      where: { id: trackId },
    });

    if (!track) {
      throw new Error(`Track not found: ${trackId}`);
    }

    const user = await prisma.user.findUnique({
      where: { id: track.userId },
    });

    if (!user) {
      throw new Error(`User not found: ${track.userId}`);
    }

    if (!audioFileUrl) {
      throw new Error(`Audio file URL not found for track: ${trackId}`);
    }

    const fileExtension = audioFileUrl.toLowerCase().split(".").pop();
    if (!isAllowedAudioFormat(fileExtension)) {
      throw new Error(
        `Audio file URL is not a WAV or FLAC file: ${audioFileUrl}`
      );
    }

    const originalFile = await getLocalFile(audioFileUrl);
    await deleteLocalFile(audioFileUrl);

    // For audio files, we process them as a single "full track"
    // We don't extract stems since they weren't separated at upload time
    console.log("Processing audio file...");

    let wavBuffer: Buffer;
    let flacBuffer: Buffer | undefined = undefined;
    if (fileExtension === "wav") {
      // WAV file can be used directly
      wavBuffer = originalFile.buffer;
    } else {
      // FLAC file - convert to WAV first for processing
      console.log("Converting FLAC to WAV for processing...");
      wavBuffer = await convertAudioToFormat(originalFile.buffer, "wav");
      console.log("FLAC to WAV conversion completed");
      flacBuffer = originalFile.buffer;
    }

    // Generate MP3 from the audio file
    const kbps = 320; // High quality for uploaded audio
    const mp3Buffer = await convertWAVToMP3(wavBuffer, kbps);

    // Generate waveform data
    const waveformResult = await generateWaveformData(wavBuffer);
    console.log("Generated waveform data");

    // FIXME: This secondsChange calculation needs to take into account whether it's a forked
    // track, where the upstream track belongs to another user
    const secondsChange = waveformResult.duration - (track.duration ?? 0);
    if (!checkUserHasCapacity({ user, secondsChange }, prisma)) {
      console.warn(
        `User ${user.id} does not have capacity to process this track. The track will not be converted.`
      );

      return;
    }

    if (fileExtension === "wav") {
      flacBuffer = await convertAudioToFormat(originalFile.buffer, "flac");
    }

    if (flacBuffer === undefined) {
      throw new Error("Failed to convert audio to FLAC");
    }

    const originalName = track.title.replace(/[^a-zA-Z0-9._-]/g, "_");

    // Upload MP3
    const mp3Url = await uploadMp3File(
      mp3Buffer,
      `${originalName}_full`,
      "tracks/"
    );
    console.log("Full track MP3 uploaded");

    // Upload FLAC
    const flacUrl = await uploadFlacFile(
      flacBuffer,
      `${originalName}_full`,
      "tracks/"
    );
    console.log("Full track FLAC uploaded");

    // Update track in database
    await prisma.track.update({
      where: { id: trackId },
      data: {
        originalUrl: null,
        fullTrackMp3Url: mp3Url,
        fullTrackWavUrl: null,
        fullTrackFlacUrl: flacUrl,
        mp3SizeBytes: mp3Buffer.length,
        wavSizeBytes: null,
        flacSizeBytes: flacBuffer.length,
        isFlacSource: true,
        waveformData: waveformResult.peaks,
        duration: waveformResult.duration,
        // Reset conversion status and timestamps when file is processed
        wavConversionStatus: AudioFileConversionStatus.NOT_STARTED,
        flacConversionStatus: AudioFileConversionStatus.NOT_STARTED,
        wavCreatedAt: null,
        flacCreatedAt: new Date(),
        wavLastRequestedAt: null,
        flacLastRequestedAt: null,
      },
    });

    // TODO: DRY this with stemProcessingProcessor, /:id/stem/:stemId route handler
    // Delete the previous audio files, but only if they are not referenced by the upstream track
    let upstreamTrack: Omit<Track, "user" | "sharedWith"> | null = null;
    if (track.forkedFromId) {
      upstreamTrack = await prisma.track.findUnique({
        where: { id: track.forkedFromId },
        include: { stems: true },
      });
    }
    for (const [url, upstreamUrl] of [
      [track.originalUrl, upstreamTrack?.originalUrl],
      [track.fullTrackMp3Url, upstreamTrack?.fullTrackMp3Url],
      [track.fullTrackWavUrl, upstreamTrack?.fullTrackWavUrl],
      [track.fullTrackFlacUrl, upstreamTrack?.fullTrackFlacUrl],
    ]) {
      if (url && url !== upstreamUrl) {
        try {
          await deleteFile(url);
        } catch (error) {
          console.error(`Failed to delete file ${url}:`, error);
        }
      }
    }

    // FIXME: This condition needs to take into account whether the previous files were actually deleted
    if (secondsChange > 0) {
      // Update user storage with the actual duration
      const { notification } = await updateUserStorage(
        {
          userId: user.id,
          secondsChange,
        },
        prisma
      );

      if (notification) {
        console.warn(
          `User ${user.id} has exceeded their storage quota. Quota warning: ${notification.message}`
        );
      }
    }

    console.log(`Audio processing completed for track ${trackId}`);

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
export const worker = new Worker(
  "full-track-replacement",
  fullTrackReplacementProcessor,
  {
    connection: fullTrackReplacementQueue.opts.connection,
    concurrency: 2,
  }
);

worker.on("completed", (job) => {
  console.log(`Full track replacement job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Full track replacement job ${job?.id} failed:`, err);
});

// Cleanup function
export async function cleanup(): Promise<void> {
  await worker.close();
  await fullTrackReplacementQueue.close();
}
