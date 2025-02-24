import { promisify } from "util";
import { exec } from "child_process";
import { writeFile, mkdtemp, rm, readdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { AppError } from "../middleware/errorHandler";
import { config } from "../config";
import { SourceFormat } from "@wavtopia/core-storage";

const execAsync = promisify(exec);

export interface ConvertedStem {
  name: string;
  type: string;
  buffer: Buffer;
  filename: string;
}

interface ConversionResult {
  fullTrackWavBuffer: Buffer;
  stems: ConvertedStem[];
}

async function convertFullTrack(
  moduleFormat: SourceFormat,
  modulePath: string,
  tempDir: string,
  fullTrackOutput: string
): Promise<{ stdout: string; stderr: string }> {
  // TODO: Try libxmp for mod files
  if (moduleFormat === SourceFormat.XM || moduleFormat === SourceFormat.MOD) {
    const { stdout, stderr } = await execAsync(
      `"${config.tools.milkyCliPath}" "${modulePath}" -output "${join(
        tempDir,
        fullTrackOutput
      )}"`
    );
    return { stdout, stderr };
  }

  if (moduleFormat === SourceFormat.IT) {
    const { stdout, stderr } = await execAsync(
      `"${config.tools.schismTrackerPath}" --headless --diskwrite="${join(
        tempDir,
        fullTrackOutput
      )}" "${modulePath}"`
    );
    return { stdout, stderr };
  }

  throw new AppError(500, `Unsupported module format: ${moduleFormat}`);
}

async function convertStems(
  moduleFormat: SourceFormat,
  modulePath: string,
  tempDir: string,
  stemsBaseName: string
): Promise<{ stdout: string; stderr: string }> {
  // TODO: Try libxmp for mod files
  if (moduleFormat === SourceFormat.XM || moduleFormat === SourceFormat.MOD) {
    const { stdout, stderr } = await execAsync(
      `"${config.tools.milkyCliPath}" "${modulePath}" -output "${join(
        tempDir,
        stemsBaseName
      )}" -multi-track`
    );
    return { stdout, stderr };
  }

  if (moduleFormat === SourceFormat.IT) {
    const { stdout, stderr } = await execAsync(
      `"${config.tools.schismTrackerPath}" --headless --diskwrite="${join(
        tempDir,
        stemsBaseName.replace(".wav", "_%c.wav")
      )}" "${modulePath}"`
    );
    return { stdout, stderr };
  }

  throw new AppError(500, `Unsupported module format: ${moduleFormat}`);
}

export async function convertModuleToWAV(
  moduleBuffer: Buffer,
  moduleFormat: SourceFormat
): Promise<ConversionResult> {
  try {
    // Create temporary directory
    const tempDir = await mkdtemp(join(tmpdir(), "wavtopia-"));
    const modulePath = join(tempDir, `input.${moduleFormat}`);
    const fullTrackOutput = "full_track.wav";
    const stemsBaseName = "output.wav"; // Base name for stem files (will become output_01.wav, etc.)

    try {
      // Write module file to temp directory
      await writeFile(modulePath, moduleBuffer);

      // First, convert the full track
      const { stderr: fullTrackStderr } = await convertFullTrack(
        moduleFormat,
        modulePath,
        tempDir,
        fullTrackOutput
      );

      if (fullTrackStderr) {
        console.error("Full track conversion stderr:", fullTrackStderr);
      }

      // Read the full track WAV
      const fullTrackWavBuffer = await readWavFile(
        join(tempDir, fullTrackOutput)
      );

      // Then convert individual stems
      const { stderr: stemsStderr } = await convertStems(
        moduleFormat,
        modulePath,
        tempDir,
        stemsBaseName
      );

      if (stemsStderr) {
        console.error("Stems conversion stderr:", stemsStderr);
      }

      // Find all generated stem WAV files in the temp directory
      const files = await readdir(tempDir);
      const wavFiles = files
        .filter((file) => file.startsWith("output_") && file.endsWith(".wav"))
        .sort(); // Sort to ensure consistent order (output_01.wav, output_02.wav, etc.)

      // Create stems from the WAV files
      const convertedStems: ConvertedStem[] = await Promise.all(
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
        stems: convertedStems,
      };
    } finally {
      // Clean up temporary directory
      await rm(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error("Error converting module to WAV:", error);
    throw new AppError(500, "Failed to convert module to WAV stems");
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
