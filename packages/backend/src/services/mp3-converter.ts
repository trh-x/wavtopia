import { promisify } from "util";
import { exec } from "child_process";
import { writeFile, mkdtemp, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { AppError } from "../middleware/errorHandler";

const execAsync = promisify(exec);

export async function convertWAVToMP3(wavBuffer: Buffer): Promise<Buffer> {
  try {
    // Create temporary directory
    const tempDir = await mkdtemp(join(tmpdir(), "wavtopia-mp3-"));
    const wavPath = join(tempDir, "input.wav");
    const mp3Path = join(tempDir, "output.mp3");

    try {
      // Write WAV file to temp directory
      await writeFile(wavPath, wavBuffer);

      // Convert to MP3 using FFmpeg with high quality settings
      const { stderr } = await execAsync(
        `ffmpeg -i "${wavPath}" -codec:a libmp3lame -b:a 320k -map_metadata 0 -id3v2_version 3 "${mp3Path}"`
      );

      if (stderr) {
        console.error("MP3 conversion stderr:", stderr);
      }

      // Read the MP3 file
      const mp3Buffer = await readFile(mp3Path);
      return mp3Buffer;
    } finally {
      // Clean up temporary directory
      await rm(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error("Error converting WAV to MP3:", error);
    throw new AppError(500, "Failed to convert WAV to MP3");
  }
}
