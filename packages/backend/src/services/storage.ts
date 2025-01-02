import { Client } from "minio";
import { AppError } from "../middleware/errorHandler";

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "",
  secretKey: process.env.MINIO_SECRET_KEY || "",
});

const bucket = process.env.MINIO_BUCKET || "wavtropolis";

export async function initializeStorage() {
  try {
    const exists = await minioClient.bucketExists(bucket);
    if (!exists) {
      await minioClient.makeBucket(bucket);
      console.log(`Created bucket: ${bucket}`);
    }
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
    const fileName = `${prefix}${Date.now()}-${file.originalname}`;
    await minioClient.putObject(bucket, fileName, file.buffer, {
      "Content-Type": file.mimetype,
    });

    const url = await minioClient.presignedGetObject(bucket, fileName);
    return url;
  } catch (error) {
    console.error("Failed to upload file:", error);
    throw new AppError(500, "Failed to upload file");
  }
}

export async function deleteFile(fileName: string): Promise<void> {
  try {
    await minioClient.removeObject(bucket, fileName);
  } catch (error) {
    console.error("Failed to delete file:", error);
    throw new AppError(500, "Failed to delete file");
  }
}

export async function getFileUrl(fileName: string): Promise<string> {
  try {
    return await minioClient.presignedGetObject(bucket, fileName);
  } catch (error) {
    console.error("Failed to get file URL:", error);
    throw new AppError(500, "Failed to get file URL");
  }
}
