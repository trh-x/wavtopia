import {
  DEFAULT_URL_EXPIRY_SECONDS,
  StorageService,
  config,
} from "@wavtopia/core-storage";
import { AppError } from "../middleware/errorHandler";
import internal from "stream";

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
    return await storageService.getFileUrl(fileName, {
      urlExpiryInSeconds,
      cacheExpiryInSeconds,
      isAttachment,
    });
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
