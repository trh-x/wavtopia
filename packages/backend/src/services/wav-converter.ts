import { promisify } from "util";
import { exec } from "child_process";
import { writeFile, mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { AppError } from "../middleware/errorHandler";

const execAsync = promisify(exec);

interface ConvertedComponent {
  name: string;
  type: string;
  buffer: Buffer;
  filename: string;
}

export async function convertXMToWAV(
  xmBuffer: Buffer
): Promise<ConvertedComponent[]> {
  try {
    // Create temporary directory
    const tempDir = await mkdtemp(join(tmpdir(), "wavtopia-"));
    const xmPath = join(tempDir, "input.xm");

    try {
      // Write XM file to temp directory
      await writeFile(xmPath, xmBuffer);

      // Run export-to-wav command
      const { stdout, stderr } = await execAsync(`export-to-wav "${xmPath}"`);

      if (stderr) {
        console.error("export-to-wav stderr:", stderr);
      }

      // Parse the output to get component information
      // This assumes export-to-wav outputs JSON with component information
      const components = JSON.parse(stdout) as {
        name: string;
        type: string;
        path: string;
      }[];

      // Read the generated WAV files and create components
      const convertedComponents: ConvertedComponent[] = await Promise.all(
        components.map(async (component) => {
          const buffer = await readWavFile(component.path);
          return {
            name: component.name,
            type: component.type,
            buffer,
            filename: `${component.name}.wav`,
          };
        })
      );

      return convertedComponents;
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
