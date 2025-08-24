import { Job, Worker } from "bullmq";
import { convertWAVToMP3 } from "../mp3-converter";
import { generateWaveformData } from "../waveform";
import { convertAudioToFormat } from "../audio-file-converter";
import { uploadFile, getObject } from "../storage";
import { config } from "@wavtopia/core-storage";
import {
  createQueue,
  prisma,
  setupQueueMonitoring,
  standardJobOptions,
} from "./common";
import { promisify } from "util";
import { exec } from "child_process";
import { writeFile, mkdtemp, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

interface TrackRegenerationJob {
  trackId: string;
  reason: "stem_updated" | "stem_deleted" | "stem_added";
  updatedStemId?: string; // The stem that was updated/deleted/added
}

// Create queue
export const trackRegenerationQueue =
  createQueue<TrackRegenerationJob>("track-regeneration");

// Utility function to upload an audio file with proper naming
async function uploadAudioFile(
  buffer: Buffer,
  filename: string,
  directory: string,
  format: "mp3" | "wav" | "flac"
): Promise<string> {
  return uploadFile(
    {
      buffer,
      originalname: `${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}.${format}`,
      mimetype:
        format === "mp3"
          ? "audio/mpeg"
          : format === "wav"
          ? "audio/wav"
          : "audio/flac",
      size: buffer.length,
    },
    directory
  );
}

// Utility function to download and get audio buffer from a URL or storage key
async function downloadAudioFile(urlOrKey: string): Promise<Buffer> {
  if (urlOrKey.startsWith("file://")) {
    // Local file
    const filePath = urlOrKey.replace("file://", "");
    return await readFile(filePath);
  } else if (
    urlOrKey.startsWith("http://") ||
    urlOrKey.startsWith("https://")
  ) {
    // Remote URL - download it
    const response = await fetch(urlOrKey);
    if (!response.ok) {
      throw new Error(`Failed to download file from ${urlOrKey}`);
    }
    return Buffer.from(await response.arrayBuffer());
  } else {
    // Storage key - use the storage service
    const stream = await getObject(urlOrKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}

// Audio mixing service to combine stems into a full track
export async function mixStemsToFullTrack(
  stems: Array<{
    buffer: Buffer;
    name: string;
  }>
): Promise<Buffer> {
  try {
    // Create temporary directory
    const tempDir = await mkdtemp(join(tmpdir(), "wavtopia-mix-"));

    try {
      // Write all stem files to temp directory
      const stemPaths: string[] = [];
      for (let i = 0; i < stems.length; i++) {
        const stemPath = join(tempDir, `stem_${i}.wav`);
        await writeFile(stemPath, stems[i].buffer);
        stemPaths.push(stemPath);
      }

      // Use FFmpeg to mix all stems together
      const outputPath = join(tempDir, "mixed_output.wav");

      // Build FFmpeg command to mix all stems
      // For each stem input: -i stem_file.wav
      // Then use amix filter to combine them: -filter_complex "amix=inputs=N:duration=longest"
      const inputArgs = stemPaths.map((path) => `-i "${path}"`).join(" ");
      const mixFilter = `amix=inputs=${
        stemPaths.length
      }:duration=longest:weights=${stemPaths.map(() => "1").join(" ")}`;

      const command = `ffmpeg -loglevel error ${inputArgs} -filter_complex "${mixFilter}" -c:a pcm_s16le "${outputPath}"`;

      console.log(`Mixing ${stems.length} stems with FFmpeg...`);
      const { stderr } = await execAsync(command);

      if (stderr) {
        console.error("FFmpeg mixing stderr:", stderr);
      }

      // Read the mixed output
      const mixedBuffer = await readFile(outputPath);
      console.log(`Successfully mixed ${stems.length} stems into full track`);

      return mixedBuffer;
    } finally {
      // Clean up temporary directory
      await rm(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error("Error mixing stems:", error);
    throw new Error(`Failed to mix stems: ${error}`);
  }
}

async function trackRegenerationProcessor(job: Job<TrackRegenerationJob>) {
  const { trackId, reason, updatedStemId } = job.data;

  console.log(
    `Processing track regeneration job ${job.id} for track: ${trackId} (reason: ${reason})`
  );

  try {
    // Get the track with all its stems
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: {
        stems: {
          orderBy: { index: "asc" },
        },
      },
    });

    if (!track) {
      throw new Error(`Track not found: ${trackId}`);
    }

    if (!track.isFork) {
      console.log(`Track ${trackId} is not a fork, skipping regeneration`);
      return;
    }

    console.log(`Found track with ${track.stems.length} stems`);

    // Check if we have enough stems to regenerate (at least 1)
    if (track.stems.length === 0) {
      console.log(`Track ${trackId} has no stems, cannot regenerate`);
      return;
    }

    // Download all stem audio files (prefer WAV, then FLAC, then MP3)
    const stemAudioData: Array<{ buffer: Buffer; name: string }> = [];

    for (const stem of track.stems) {
      let audioUrl: string | null = null;
      let audioBuffer: Buffer;

      // Priority: WAV > FLAC > MP3
      if (stem.wavUrl) {
        audioUrl = stem.wavUrl;
        console.log(`Using WAV for stem ${stem.name}`);
      } else if (stem.flacUrl) {
        audioUrl = stem.flacUrl;
        console.log(`Using FLAC for stem ${stem.name}`);
      } else if (stem.mp3Url) {
        audioUrl = stem.mp3Url;
        console.log(`Using MP3 for stem ${stem.name} (will convert to WAV)`);
      } else {
        throw new Error(
          `Stem ${stem.id} (${stem.name}) has no audio files available`
        );
      }

      // Download the audio file
      audioBuffer = await downloadAudioFile(audioUrl);

      // If it's not WAV, convert it to WAV for mixing
      if (!audioUrl.includes(".wav")) {
        if (audioUrl.includes(".flac")) {
          audioBuffer = await convertAudioToFormat(audioBuffer, "wav");
        } else if (audioUrl.includes(".mp3")) {
          // For MP3, we need to use FFmpeg to convert to WAV
          const tempDir = await mkdtemp(join(tmpdir(), "wavtopia-convert-"));
          try {
            const inputPath = join(tempDir, "input.mp3");
            const outputPath = join(tempDir, "output.wav");

            await writeFile(inputPath, audioBuffer);

            const { stderr } = await execAsync(
              `ffmpeg -loglevel error -i "${inputPath}" -c:a pcm_s16le "${outputPath}"`
            );

            if (stderr) {
              console.error("MP3 to WAV conversion stderr:", stderr);
            }

            audioBuffer = await readFile(outputPath);
          } finally {
            await rm(tempDir, { recursive: true, force: true });
          }
        }
      }

      stemAudioData.push({
        buffer: audioBuffer,
        name: stem.name,
      });
    }

    console.log(
      `Downloaded and prepared ${stemAudioData.length} stems for mixing`
    );

    // Mix all stems into a full track
    const fullTrackWavBuffer = await mixStemsToFullTrack(stemAudioData);

    // Generate waveform data for the full track
    console.log("Generating waveform data for regenerated full track...");
    const waveformResult = await generateWaveformData(fullTrackWavBuffer);
    console.log("Full track waveform data generated");

    // Convert to MP3
    console.log("Converting regenerated full track to MP3...");
    const kbps = 320; // High quality for full track
    const mp3Buffer = await convertWAVToMP3(fullTrackWavBuffer, kbps);
    console.log("Full track MP3 conversion complete");

    // Convert to FLAC
    console.log("Converting regenerated full track to FLAC...");
    const flacBuffer = await convertAudioToFormat(fullTrackWavBuffer, "flac");
    console.log("Full track FLAC conversion complete");

    // Upload all three formats
    const trackName = track.title.replace(/[^a-zA-Z0-9._-]/g, "_");

    const [mp3Url, wavUrl, flacUrl] = await Promise.all([
      uploadAudioFile(mp3Buffer, `${trackName}_full`, "tracks/", "mp3"),
      uploadAudioFile(
        fullTrackWavBuffer,
        `${trackName}_full`,
        "tracks/",
        "wav"
      ),
      uploadAudioFile(flacBuffer, `${trackName}_full`, "tracks/", "flac"),
    ]);

    console.log("All full track formats uploaded successfully");

    // Update the track in the database with new files
    await prisma.track.update({
      where: { id: trackId },
      data: {
        fullTrackMp3Url: mp3Url,
        fullTrackWavUrl: wavUrl,
        fullTrackFlacUrl: flacUrl,
        waveformData: waveformResult.peaks,
        duration: waveformResult.duration,
        mp3SizeBytes: mp3Buffer.length,
        wavSizeBytes: fullTrackWavBuffer.length,
        flacSizeBytes: flacBuffer.length,
        // Reset conversion status since we have new files
        wavConversionStatus: "COMPLETED",
        flacConversionStatus: "COMPLETED",
      },
    });

    console.log(`Track regeneration completed for: ${trackId}`);

    return {
      trackId,
      mp3Url,
      wavUrl,
      flacUrl,
      mp3SizeBytes: mp3Buffer.length,
      wavSizeBytes: fullTrackWavBuffer.length,
      flacSizeBytes: flacBuffer.length,
      waveformData: waveformResult.peaks,
      duration: waveformResult.duration,
    };
  } catch (error) {
    console.error(`Error regenerating track ${trackId}:`, error);
    throw error;
  }
}

// Create worker
export const worker = new Worker(
  "track-regeneration",
  trackRegenerationProcessor,
  {
    connection: config.redis,
    concurrency: 1, // Process one track regeneration at a time to avoid conflicts
  }
);

// Setup monitoring
setupQueueMonitoring(trackRegenerationQueue, "Track Regeneration");

// Export queue function
export const queueTrackRegeneration = async (
  trackId: string,
  reason: "stem_updated" | "stem_deleted" | "stem_added",
  updatedStemId?: string
) => {
  const job = await trackRegenerationQueue.add(
    "regenerate-track",
    {
      trackId,
      reason,
      updatedStemId,
    },
    standardJobOptions
  );

  return job.id;
};

// Cleanup function for graceful shutdown
export async function cleanup(): Promise<void> {
  await worker.close();
}
