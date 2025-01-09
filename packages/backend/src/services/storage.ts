import { Client } from "minio";
import { AppError } from "../middleware/errorHandler";
import config from "../config";

export const minioClient = new Client({
  endPoint: config.storage.endpoint,
  port: config.storage.port,
  useSSL: config.storage.useSSL,
  accessKey: config.storage.accessKey,
  secretKey: config.storage.secretKey,
});

export const bucket = config.storage.bucket;

export async function initializeStorage() {
  try {
    const exists = await minioClient.bucketExists(bucket);
    if (!exists) {
      await minioClient.makeBucket(bucket);
      // Make bucket public for downloads
      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      };
      await minioClient.setBucketPolicy(bucket, JSON.stringify(policy));
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
    const metadata = {
      "content-type": file.mimetype,
      "content-length": file.buffer.length.toString(),
      "original-filename": file.originalname,
    };

    await minioClient.putObject(
      bucket,
      fileName,
      file.buffer,
      undefined,
      metadata
    );

    return fileName;
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
    return await minioClient.presignedGetObject(
      bucket,
      fileName,
      7 * 24 * 60 * 60
    );
  } catch (error) {
    console.error("Failed to get file URL:", error);
    throw new AppError(500, "Failed to get file URL");
  }
}
