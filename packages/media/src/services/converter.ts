import { promisify } from "util";
import { exec } from "child_process";
import path from "path";
import { AppError } from "../middleware/errorHandler";

const execAsync = promisify(exec);

export async function convertToWav(inputPath: string): Promise<string> {
  try {
    const outputPath = path.join(
      "/tmp/converted",
      `${path.parse(inputPath).name}.wav`
    );

    const command = `ffmpeg -i "${inputPath}" -acodec pcm_s16le -ar 44100 -ac 2 "${outputPath}"`;

    await execAsync(command);
    return outputPath;
  } catch (error) {
    console.error("Error converting file:", error);
    throw new AppError(500, "Failed to convert audio file");
  }
}
