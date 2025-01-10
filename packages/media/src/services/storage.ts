import { StorageService, config, StorageFile } from "@wavtopia/core-storage";
import fs from "fs/promises";

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

export async function getLocalFile(fileName: string): Promise<StorageFile> {
  const filePath = `/tmp/uploads/${fileName}`;
  const buffer = await fs.readFile(filePath);
  const originalname = fileName.split("/").pop() || fileName;

  return {
    buffer,
    originalname,
    mimetype: getMimeType(originalname),
    fieldname: "file",
    encoding: "7bit",
    size: buffer.length,
    destination: "/tmp/uploads",
    filename: fileName,
    path: filePath,
    stream: undefined as any,
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
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}
