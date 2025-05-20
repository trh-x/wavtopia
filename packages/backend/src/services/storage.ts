import {
  DEFAULT_URL_EXPIRY_SECONDS,
  StorageService,
  config,
} from "@wavtopia/core-storage";
import { config as backendConfig } from "../config";
import { AppError } from "../middleware/errorHandler";
import internal from "stream";
import { prisma } from "../lib/prisma";

// Extract complex parameter types
type GetFileUrlParams = Parameters<StorageService["getFileUrl"]>;
type GetFileUrlOptions = NonNullable<GetFileUrlParams[1]>;

const storageService = new StorageService(config.storage);

export async function initializeStorage(): Promise<void> {
  try {
    await storageService.initialize();
  } catch (error) {
    console.error("Failed to initialize storage:", error);
    throw error;
  }
}

export async function uploadFile(
  file: Express.Multer.File,
  prefix: string = ""
): Promise<string> {
  try {
    return await storageService.uploadFile(file, prefix);
  } catch (error) {
    console.error("Failed to upload file:", error);
    throw new AppError(500, "Failed to upload file");
  }
}

export async function deleteFile(fileName: string): Promise<void> {
  try {
    await storageService.deleteFile(fileName);
  } catch (error) {
    console.error("Failed to delete file:", error);
    throw new AppError(500, "Failed to delete file");
  }
}

export async function getFileUrl(
  fileName: string,
  {
    urlExpiryInSeconds = DEFAULT_URL_EXPIRY_SECONDS,
    cacheExpiryInSeconds,
    isAttachment = false,
  }: GetFileUrlOptions = {}
): Promise<string> {
  try {
    const minioUrl = await storageService.getFileUrl(fileName, {
      urlExpiryInSeconds,
      cacheExpiryInSeconds,
      isAttachment,
    });

    // Transform URL if enabled
    if (
      backendConfig.client.storageUrlTransformEnabled &&
      backendConfig.client.publicUrl
    ) {
      const url = new URL(minioUrl);
      const pathWithBucket = url.pathname;
      // Replace /wavtopia/ with /storage/ in the path
      const newPath = pathWithBucket.replace(/^\/wavtopia\//, "/storage/");
      const newUrl = new URL(
        `${newPath}${url.search}`,
        backendConfig.client.publicUrl
      );
      return newUrl.toString();
    }

    // In development, return the original MinIO URL
    return minioUrl;
  } catch (error) {
    console.error("Failed to get file URL:", error);
    throw new AppError(500, "Failed to get file URL");
  }
}

export async function getObject(fileName: string): Promise<internal.Readable> {
  try {
    return await storageService.getObject(fileName);
  } catch (error) {
    console.error("Failed to get object:", error);
    throw new AppError(500, "Failed to get object");
  }
}

/**
 * Gets the default free storage quota from system settings
 */
export async function getDefaultFreeQuota(): Promise<number> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "FREE_STORAGE_QUOTA_SECONDS" },
    select: { numberValue: true },
  });

  if (!setting?.numberValue) {
    throw new Error("System storage quota not configured");
  }

  return Number(setting.numberValue);
}
