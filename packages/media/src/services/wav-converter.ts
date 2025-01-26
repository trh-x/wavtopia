import { promisify } from "util";
import { exec } from "child_process";
import { writeFile, mkdtemp, rm, readdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { AppError } from "../middleware/errorHandler";
import { config } from "../config";

const execAsync = promisify(exec);

interface ConvertedComponent {
  name: string;
  type: string;
  buffer: Buffer;
  filename: string;
}

interface ConversionResult {
  fullTrackWavBuffer: Buffer;
  components: ConvertedComponent[];
}

export async function convertXMToWAV(
  xmBuffer: Buffer
): Promise<ConversionResult> {
  try {
    // Create temporary directory
    const tempDir = await mkdtemp(join(tmpdir(), "wavtopia-"));
    const xmPath = join(tempDir, "input.xm");
    const fullTrackOutput = "full_track.wav";
    const componentsBaseName = "output.wav"; // Base name for component files (will become output_01.wav, etc.)

    try {
      // Write XM file to temp directory
      await writeFile(xmPath, xmBuffer);

      // First, convert the full track
      const { stderr: fullTrackStderr } = await execAsync(
        `"${config.tools.exportToWavPath}" "${xmPath}" --output "${join(
          tempDir,
          fullTrackOutput
        )}"`
      );

      if (fullTrackStderr) {
        console.error("Full track conversion stderr:", fullTrackStderr);
      }

      // Read the full track WAV
      const fullTrackWavBuffer = await readWavFile(
        join(tempDir, fullTrackOutput)
      );

      // Then convert individual components
      const { stderr: componentsStderr } = await execAsync(
        `"${config.tools.exportToWavPath}" "${xmPath}" --output "${join(
          tempDir,
          componentsBaseName
        )}" --multi-track`
      );

      if (componentsStderr) {
        console.error("Components conversion stderr:", componentsStderr);
      }

      // Find all generated component WAV files in the temp directory
      const files = await readdir(tempDir);
      const wavFiles = files
        .filter((file) => file.startsWith("output_") && file.endsWith(".wav"))
        .sort(); // Sort to ensure consistent order (output_01.wav, output_02.wav, etc.)

      // Create components from the WAV files
      const convertedComponents: ConvertedComponent[] = await Promise.all(
        wavFiles.map(async (filename, index) => {
          const buffer = await readWavFile(join(tempDir, filename));
          // Extract track number from filename (e.g., "output_01.wav" -> "01")
          const trackNum =
            filename.match(/_(\d+)\.wav$/)?.[1] || String(index + 1);

          return {
            name: `Track ${trackNum}`, // Default name if we don't have specific track info
            type: "audio", // Default type if we don't have specific track info
            buffer,
            filename: `track_${trackNum}.wav`,
          };
        })
      );

      return {
        fullTrackWavBuffer,
        components: convertedComponents,
      };
    } finally {
      // Clean up temporary directory
      await rm(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error("Error converting XM to WAV:", error);
    throw new AppError(500, "Failed to convert XM to WAV components");
  }
}

async function readWavFile(path: string): Promise<Buffer> {
  try {
    const { readFile } = await import("fs/promises");
    return await readFile(path);
  } catch (error) {
    console.error("Error reading WAV file:", error);
    throw new AppError(500, "Failed to read converted WAV file");
  }
}
