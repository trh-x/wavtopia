import { StorageService } from "@wavtopia/core-storage";
import fs from "fs/promises";

const storageService = new StorageService({
  endpoint: process.env.STORAGE_ENDPOINT || "localhost",
  port: parseInt(process.env.STORAGE_PORT || "9000"),
  useSSL: process.env.STORAGE_USE_SSL === "true",
  accessKey: process.env.STORAGE_ACCESS_KEY || "minioadmin",
  secretKey: process.env.STORAGE_SECRET_KEY || "minioadmin",
  bucket: process.env.STORAGE_BUCKET || "wavtopia",
});

export async function initializeStorage(): Promise<void> {
  await storageService.initialize();
}

export async function uploadFile(
  file: Express.Multer.File,
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

export async function getLocalFile(
  fileName: string
): Promise<Express.Multer.File> {
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
