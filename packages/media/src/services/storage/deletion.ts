import { deleteLocalFile } from "@wavtopia/core-storage";
import { deleteFile } from "../storage";

export class FileCleanupError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "FileCleanupError";
  }
}

export interface DeletionFailure {
  fileUrl: string;
  error: Error;
}

/**
 * Attempt to delete a file with retries and exponential backoff
 */
export async function retryableDeleteFile(
  fileUrl: string,
  maxRetries = 3
): Promise<void> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (fileUrl.startsWith("file://")) {
        await deleteLocalFile(fileUrl);
      } else {
        await deleteFile(fileUrl);
      }
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        console.log(
          `Retry ${attempt}/${maxRetries} for ${fileUrl} after ${delay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw new FileCleanupError(
    `Failed to delete file after ${maxRetries} attempts: ${fileUrl}`,
    lastError
  );
}

/**
 * Helper function to delete a file if it exists, with retries
 */
export async function deleteFileIfExists(
  url: string | null | undefined,
  maxRetries = 3
): Promise<DeletionFailure | null> {
  if (!url) return null;

  try {
    await retryableDeleteFile(url, maxRetries);
    return null;
  } catch (error) {
    return {
      fileUrl: url,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Process deletions in batches to limit concurrent requests
 */
export async function processBatchedDeletions(
  urls: (string | null | undefined)[],
  batchSize: number = 3,
  maxRetries = 3
): Promise<DeletionFailure[]> {
  const failures: DeletionFailure[] = [];

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((url) => deleteFileIfExists(url, maxRetries))
    );

    // Collect failures from this batch
    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value) {
        failures.push(result.value);
      } else if (result.status === "rejected") {
        // This shouldn't happen since deleteFileIfExists catches errors, but handle it just in case
        failures.push({
          fileUrl: "unknown",
          error:
            result.reason instanceof Error
              ? result.reason
              : new Error(String(result.reason)),
        });
      }
    });
  }

  return failures;
}
