import { promisify } from "util";
import { exec } from "child_process";
import { writeFile, mkdtemp, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { AppError } from "../middleware/errorHandler";

const execAsync = promisify(exec);

export async function convertWAVToMP3(
  wavBuffer: Buffer,
  kbps: number
): Promise<Buffer> {
  try {
    // Create temporary directory
    const tempDir = await mkdtemp(join(tmpdir(), "wavtopia-mp3-"));
    const wavPath = join(tempDir, "input.wav");
    const mp3Path = join(tempDir, "output.mp3");

    try {
      // Write WAV file to temp directory
      await writeFile(wavPath, wavBuffer);

      // Convert to MP3 using FFmpeg piped to LAME with stream buffering
      // Using pipe-through with 'cat' ensures zero start time in the MP3.
      // When LAME writes directly to a file, it can add padding/metadata that results in a non-zero start time (e.g. 0.025057s).
      // Piping through 'cat' maintains clean stream writing, preserving the exact timing of the audio data.
      // This is crucial for accurate seeking in the browser's audio player.
      // TODO: Find a better solution that doesn't require piping through 'cat'.
      // Note, to see more output in the logs, remove the -loglevel error flag
      const { stderr } = await execAsync(
        `ffmpeg -loglevel error -i "${wavPath}" -f wav - | lame -b ${kbps} --cbr --noreplaygain --pad-id3v2 - | cat > "${mp3Path}"`
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
