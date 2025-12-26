import { Job, Worker } from "bullmq";
import {
  SourceFormat,
  TrackStatus,
  deleteLocalFile,
  updateUserStorage,
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
import { convertAudioToFormat } from "../audio-file-converter";
import { AppError } from "../../middleware/errorHandler";

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

// Create queue
export const audioProcessingQueue =
  createQueue<AudioProcessingJob>("audio-processing");

// Set up monitoring
setupQueueMonitoring(audioProcessingQueue, "Audio Processing");

interface StemFileData {
  url: string;
  size: number;
  originalName: string;
  metadata: {
    name: string;
    type: string;
  };
}

interface AudioProcessingJob {
  trackId: string;
  stemFiles?: StemFileData[];
}

// Queue a track for audio processing
export async function queueAudioProcessing(
  trackId: string,
  stemFiles?: StemFileData[]
): Promise<string> {
  const job = await audioProcessingQueue.add(
    "process-audio",
    { trackId, stemFiles },
    standardJobOptions
  );
  return job.id!;
}

// Process audio file (WAV/FLAC) - generates MP3 and waveform data
async function audioProcessingProcessor(job: Job<AudioProcessingJob>) {
  console.log(`Processing audio job ${job.id} for track: ${job.data.trackId}`);

  try {
    const { trackId, stemFiles } = job.data;

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

    if (user.isOverQuota) {
      if (track.originalUrl) {
        await deleteLocalFile(track.originalUrl);
      }

      if (track.coverArt) {
        await deleteLocalFile(track.coverArt);
      }

      console.warn(
        `User ${track.userId} has exceeded their storage quota. The track will not be converted. The original file and cover art have been cleared.`
      );

      await prisma.track.update({
        where: { id: trackId },
        data: {
          originalUrl: null,
          coverArt: null,
        },
      });

      return;
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

    // Upload cover art if provided
    let coverArtUrl: string | undefined;
    if (track.coverArt) {
      const coverArtFile = await getLocalFile(track.coverArt);
      console.log("Uploading cover art...");
      coverArtUrl = await uploadFile(coverArtFile, "covers/");
      await deleteLocalFile(track.coverArt);
      console.log("Cover art uploaded:", coverArtUrl);
    }

    // For audio files, we process them as a single "full track"
    // We don't extract stems since they weren't separated at upload time
    console.log("Processing audio file...");

    let wavBuffer: Buffer;
    let flacBuffer: Buffer;
    if (track.originalFormat === SourceFormat.WAV) {
      // WAV file can be used directly
      wavBuffer = originalFile.buffer;
      flacBuffer = await convertAudioToFormat(originalFile.buffer, "flac");
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

    // Upload MP3
    const mp3Url = await uploadMp3File(
      mp3Buffer,
      `${originalName}_full`,
      "tracks/"
    );
    console.log("Full track MP3 uploaded");

    const flacUrl = await uploadFlacFile(
      flacBuffer,
      `${originalName}_full`,
      "tracks/"
    );
    console.log("Full track FLAC uploaded");

    // TODO: Wrap these database operations in a transaction

    // Update track in database
    await prisma.track.update({
      where: { id: trackId },
      data: {
        originalUrl: null, // fullTrackFlacUrl is the main file URL for audio tracks
        coverArt: coverArtUrl,
        fullTrackMp3Url: mp3Url,
        mp3SizeBytes: mp3Buffer.length,
        fullTrackFlacUrl: flacUrl,
        flacSizeBytes: flacBuffer.length,
        isFlacSource: true,
        waveformData: waveformResult.peaks,
        duration: waveformResult.duration,
      },
    });

    console.log(`Audio processing completed for track ${trackId}`);

    // Process stem files if provided
    const processedStems: any[] = [];
    if (stemFiles && stemFiles.length > 0) {
      console.log(`Processing ${stemFiles.length} stem files...`);

      for (let i = 0; i < stemFiles.length; i++) {
        const stemFile = stemFiles[i];
        console.log(
          `Processing stem ${i + 1}/${stemFiles.length}: ${
            stemFile.metadata.name
          }`
        );

        try {
          // Get the stem file
          const stemFileData = await getLocalFile(stemFile.url);

          // Convert stem to WAV if it's FLAC
          let stemWavBuffer: Buffer;
          let stemFlacBuffer: Buffer;
          const stemExtension = stemFile.originalName
            .split(".")
            .pop()
            ?.toLowerCase();
          if (stemExtension === "flac") {
            console.log(
              `Converting FLAC stem ${stemFile.metadata.name} to WAV for processing...`
            );
            stemWavBuffer = await convertAudioToFormat(
              stemFileData.buffer,
              "wav"
            );
            stemFlacBuffer = stemFileData.buffer;
          } else {
            stemWavBuffer = stemFileData.buffer;
            stemFlacBuffer = await convertAudioToFormat(
              stemFileData.buffer,
              "flac"
            );
          }

          // Generate MP3 from the stem file
          const stemMp3Buffer = await convertWAVToMP3(stemWavBuffer, 192); // Lower quality for stems

          // Generate waveform data for stem
          const stemWaveformResult = await generateWaveformData(stemWavBuffer);

          const stemName = `${originalName}_${stemFile.metadata.name.replace(
            /[^a-z0-9]/gi,
            "_"
          )}`;

          // Upload stem MP3
          const stemMp3Url = await uploadMp3File(
            stemMp3Buffer,
            stemName,
            "stems/"
          );

          // Upload original stem file
          const stemFlacUrl = await uploadFlacFile(
            stemFlacBuffer,
            stemName,
            "stems/"
          );

          // Create stem record in database
          const stem = await prisma.stem.create({
            data: {
              index: i,
              name: stemFile.metadata.name,
              type: stemFile.metadata.type,
              trackId: trackId,
              mp3Url: stemMp3Url,
              mp3SizeBytes: stemMp3Buffer.length,
              flacUrl: stemFlacUrl,
              flacSizeBytes: stemFlacBuffer.length,
              waveformData: stemWaveformResult.peaks,
              duration: stemWaveformResult.duration,
            },
          });

          // Clean up temporary stem file
          await deleteLocalFile(stemFile.url);

          processedStems.push({
            id: stem.id,
            name: stem.name,
            mp3Url: stemMp3Url,
            duration: stemWaveformResult.duration,
          });

          console.log(`Stem ${stemFile.metadata.name} processed successfully`);
        } catch (stemError) {
          console.error(
            `Error processing stem ${stemFile.metadata.name}:`,
            stemError
          );
          // Continue processing other stems even if one fails
        }
      }
    }

    const totalQuotaSeconds =
      waveformResult.duration +
      processedStems.reduce((acc, stem) => acc + stem.duration, 0);

    // Update storage usage and get quota warning
    const { notification } = await updateUserStorage(
      {
        secondsChange: totalQuotaSeconds,
        userId: user.id,
      },
      prisma
    );

    if (notification) {
      console.warn(
        `User ${user.id} has exceeded their storage quota. Quota warning: ${notification.message}`
      );
    }

    return {
      trackId,
      status: "completed",
      mp3Url,
      waveformData: waveformResult.peaks,
      duration: waveformResult.duration,
      stemsProcessed: processedStems.length,
      stems: processedStems,
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
