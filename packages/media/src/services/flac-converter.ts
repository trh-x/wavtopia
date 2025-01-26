import { promisify } from "util";
import { exec } from "child_process";
import { writeFile, mkdtemp, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { AppError } from "../middleware/errorHandler";

const execAsync = promisify(exec);

export async function convertWAVToFLAC(wavBuffer: Buffer): Promise<Buffer> {
  try {
    // Create temporary directory
    const tempDir = await mkdtemp(join(tmpdir(), "wavtopia-flac-"));
    const wavPath = join(tempDir, "input.wav");
    const flacPath = join(tempDir, "output.flac");

    try {
      // Write WAV file to temp directory
      await writeFile(wavPath, wavBuffer);

      // Convert to FLAC using FFmpeg
      // -compression_level 5 provides a good balance between compression and speed
      // Range is 0-12, where 0 is fastest/largest, 12 is slowest/smallest
      const { stderr } = await execAsync(
        `ffmpeg -i "${wavPath}" -c:a flac -compression_level 5 "${flacPath}"`
      );

      if (stderr) {
        console.error("FLAC conversion stderr:", stderr);
      }

      // Read the FLAC file
      const flacBuffer = await readFile(flacPath);
      return flacBuffer;
    } finally {
      // Clean up temporary directory
      await rm(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error("Error converting WAV to FLAC:", error);
    throw new AppError(500, "Failed to convert WAV to FLAC");
  }
}

export async function convertFLACToWAV(flacBuffer: Buffer): Promise<Buffer> {
  try {
    // Create temporary directory
    const tempDir = await mkdtemp(join(tmpdir(), "wavtopia-wav-"));
    const flacPath = join(tempDir, "input.flac");
    const wavPath = join(tempDir, "output.wav");

    try {
      // Write FLAC file to temp directory
      await writeFile(flacPath, flacBuffer);

      // Convert to WAV using FFmpeg
      const { stderr } = await execAsync(
        `ffmpeg -i "${flacPath}" -c:a pcm_s16le "${wavPath}"`
      );

      if (stderr) {
        console.error("WAV conversion stderr:", stderr);
      }

      // Read the WAV file
      const wavBuffer = await readFile(wavPath);
      return wavBuffer;
    } finally {
      // Clean up temporary directory
      await rm(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error("Error converting FLAC to WAV:", error);
    throw new AppError(500, "Failed to convert FLAC to WAV");
  }
}
