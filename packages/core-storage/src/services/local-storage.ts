import fs from "fs/promises";
import path from "path";

function normalizeFilePath(filePathOrUrl: string): string {
  if (filePathOrUrl.startsWith("file://")) {
    // Convert file:// URL to local path
    return decodeURIComponent(filePathOrUrl.slice(7));
  }
  return filePathOrUrl;
}

export async function deleteLocalFile(filePathOrUrl: string): Promise<void> {
  const filePath = normalizeFilePath(filePathOrUrl);

  try {
    // Check if file exists before attempting deletion
    await fs.access(filePath);
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // File doesn't exist, we can consider this a success
      return;
    }
    console.error("Failed to delete local file:", error);
    throw new Error("Failed to delete local file");
  }
}

export async function ensureDirectoryExists(
  directoryPath: string
): Promise<void> {
  try {
    await fs.mkdir(directoryPath, { recursive: true });
  } catch (error) {
    console.error("Failed to create directory:", error);
    throw new Error("Failed to create directory");
  }
}
