import Queue, { Job } from "bull";
import { convertXMToWAV } from "../services/wav-converter";
import { convertWAVToMP3 } from "../services/mp3-converter";
import { generateWaveformData } from "../services/waveform";
import { PrismaService } from "@wavtopia/core-storage";
import { uploadFile, deleteFile, getLocalFile } from "../services/storage";

interface ConversionJob {
  trackId: string;
}

const prisma = new PrismaService({
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/wavtopia",
}).db;

// Create a new queue
export const conversionQueue = new Queue<ConversionJob>("audio-conversion", {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
  },
});

// Process jobs
conversionQueue.process(async (job: Job<ConversionJob>) => {
  console.log(
    `Processing conversion job ${job.id} for track: ${job.data.trackId}`
  );

  try {
    const { trackId } = job.data;

    // First check if track is public
    const track = await prisma.track.findUnique({
      where: { id: trackId },
    });

    const originalFile = await getLocalFile(track.originalUrl);
    const originalName = track.originalUrl.replace(/\.[^/.]+$/, "");

    const coverArtFile = track.coverArt
      ? await getLocalFile(track.coverArt)
      : undefined;

    // Upload original file
    console.log("Uploading original file...");
    const originalUrl = await uploadFile(originalFile, "originals/");
    console.log("Original file uploaded:", originalUrl);

    // Upload cover art if provided
    let coverArtUrl: string | undefined;
    if (coverArtFile) {
      console.log("Uploading cover art...");
      coverArtUrl = await uploadFile(coverArtFile, "covers/");
      console.log("Cover art uploaded:", coverArtUrl);
    }

    // Convert XM to WAV
    console.log("Converting XM to WAV...");
    const { fullTrackBuffer, components } = await convertXMToWAV(
      originalFile.buffer
    );
    console.log("XM conversion complete. Components:", components.length);

    // Generate waveform data for full track
    console.log("Generating waveform data for full track...");
    const fullTrackWaveform = await generateWaveformData(fullTrackBuffer);
    console.log("Full track waveform data generated");

    // Convert full track to MP3
    console.log("Converting full track to MP3...");
    const fullTrackMp3Buffer = await convertWAVToMP3(fullTrackBuffer);
    console.log("Full track MP3 conversion complete");

    // Upload full track files
    console.log("Uploading full track files...");
    const [fullTrackUrl, fullTrackMp3Url] = await Promise.all([
      uploadFile(
        {
          buffer: fullTrackBuffer,
          originalname: `${originalName}_full.wav`,
          mimetype: "audio/wav",
        } as Express.Multer.File,
        "tracks/"
      ),
      uploadFile(
        {
          buffer: fullTrackMp3Buffer,
          originalname: `${originalName}_full.mp3`,
          mimetype: "audio/mpeg",
        } as Express.Multer.File,
        "tracks/"
      ),
    ]);
    console.log("Full track files uploaded");

    // Convert and upload component files
    console.log("Processing components...");
    const componentUploads = await Promise.all(
      components.map(async (component, index) => {
        console.log(
          `Processing component ${index + 1}/${components.length}: ${
            component.name
          }`
        );
        const mp3Buffer = await convertWAVToMP3(component.buffer);
        const componentName = `${originalName}_${component.name.replace(
          /[^a-z0-9]/gi,
          "_"
        )}`;

        const waveformData = await generateWaveformData(component.buffer);
        console.log(`Generated waveform data for component: ${component.name}`);

        const [wavUrl, mp3Url] = await Promise.all([
          uploadFile(
            {
              buffer: component.buffer,
              originalname: `${componentName}.wav`,
              mimetype: "audio/wav",
            } as Express.Multer.File,
            "components/"
          ),
          uploadFile(
            {
              buffer: mp3Buffer,
              originalname: `${componentName}.mp3`,
              mimetype: "audio/mpeg",
            } as Express.Multer.File,
            "components/"
          ),
        ]);

        console.log(`Component ${component.name} files uploaded`);
        return {
          name: component.name,
          type: component.type,
          wavUrl,
          mp3Url,
          waveformData,
        };
      })
    );

    console.log("Updating database record...");
    try {
      const track = await prisma.track.update({
        where: { id: trackId },
        data: {
          originalUrl: originalUrl,
          fullTrackUrl: fullTrackUrl,
          fullTrackMp3Url: fullTrackMp3Url,
          waveformData: fullTrackWaveform,
          coverArt: coverArtUrl,
          components: {
            create: componentUploads,
          },
        },
      });

      console.log("Track updated successfully:", track.id);
    } catch (dbError) {
      console.error("Database error during track creation:", dbError);

      // Clean up uploaded files if database operation fails
      console.log("Cleaning up uploaded files...");
      try {
        await Promise.all([
          deleteFile(originalUrl),
          deleteFile(fullTrackUrl),
          deleteFile(fullTrackMp3Url),
          ...(coverArtUrl ? [deleteFile(coverArtUrl)] : []),
          ...componentUploads.flatMap((comp) => [
            deleteFile(comp.wavUrl),
            deleteFile(comp.mp3Url),
          ]),
        ]);
        console.log("Cleanup completed");
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
      }

      // Check for disk space error
      if (
        typeof dbError === "object" &&
        dbError !== null &&
        "code" in dbError &&
        dbError.code === "53100"
      ) {
        console.error("Insufficient storage space.");
      }
      throw dbError;
    }
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
    throw error;
  }
});

// Add job to queue
export const queueConversion = async (trackId: string) => {
  const job = await conversionQueue.add(
    {
      trackId,
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    }
  );

  return job.id;
};

// Event handlers for monitoring
conversionQueue.on("completed", (job: Job<ConversionJob>) => {
  console.log(`Job ${job.id} completed successfully`);
});

conversionQueue.on("failed", (job: Job<ConversionJob>, error: Error) => {
  console.error(`Job ${job.id} failed:`, error);
});
