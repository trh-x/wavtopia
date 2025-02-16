import {
  StorageFile,
  StorageService,
  config,
  normalizeFilePath,
} from "@wavtopia/core-storage";
import fs from "fs/promises";
import internal from "stream";

const storageService = new StorageService(config.storage);

// TODO: Harmonize or share this with the backend package equivalent
export async function initializeStorage(): Promise<void> {
  await storageService.initialize();
}

export async function uploadFile(
  file: StorageFile,
  prefix: string = ""
): Promise<string> {
  return await storageService.uploadFile(file, prefix);
}

export async function deleteFile(fileName: string): Promise<void> {
  await storageService.deleteFile(fileName);
}

export async function getFileUrl(fileName: string): Promise<string> {
  return await storageService.getFileUrl(fileName);
}

export async function getObject(fileName: string): Promise<internal.Readable> {
  return await storageService.getObject(fileName);
}

export async function getLocalFile(
  filePathOrUrl: string
): Promise<StorageFile> {
  const filePath = normalizeFilePath(filePathOrUrl);
  const buffer = await fs.readFile(filePath);
  // TODO: Retain the original file name from the point of upload
  const originalname = filePath.split("/").pop() || filePath;

  return {
    buffer,
    originalname,
    mimetype: getMimeType(originalname),
    size: buffer.length,
  };
}

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "xm":
      return "audio/x-xm";
    case "it":
      return "audio/x-it";
    case "mod":
      return "audio/x-mod";
    case "flac":
      return "audio/flac";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}
