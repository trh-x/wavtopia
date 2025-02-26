import { Client } from "minio";
import internal from "stream";
import type { StorageConfig } from "../config";

// TODO: Remove the reference to Express.Multer.File from this package
export type StorageFile = Express.Multer.File;

export class StorageService {
  private client: Client;
  private bucket: string;

  constructor(config: StorageConfig) {
    const { secretKey, ...rest } = config;
    console.log("Initializing storage service with config:", {
      ...rest,
      secretKey: secretKey.slice(0, 2) + "..." + secretKey.slice(-2),
    });
    this.client = new Client({
      endPoint: config.endpoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });

    this.bucket = config.bucket;
  }

  async initialize(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        // Make bucket public for downloads
        const policy = {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { AWS: ["*"] },
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${this.bucket}/*`],
            },
          ],
        };
        await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy));
        console.log(`Created bucket: ${this.bucket}`);
      }
    } catch (error) {
      console.error("Failed to initialize storage:", error);
      throw error;
    }
  }

  async uploadFile(file: StorageFile, prefix: string = ""): Promise<string> {
    try {
      const fileName = `${prefix}${Date.now()}-${file.originalname}`;
      const metadata = {
        "content-type": file.mimetype,
        "content-length": file.buffer.length.toString(),
        "original-filename": file.originalname,
      };

      await this.client.putObject(
        this.bucket,
        fileName,
        file.buffer,
        undefined,
        metadata
      );

      return fileName;
    } catch (error) {
      console.error("Failed to upload file:", error);
      throw new Error("Failed to upload file");
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, fileName);
    } catch (error) {
      console.error("Failed to delete file:", error);
      throw new Error("Failed to delete file");
    }
  }

  async getFileUrl(
    fileName: string,
    expiryInSeconds: number = 7 * 24 * 60 * 60
  ): Promise<string> {
    try {
      // TODO: Implement client-side caching for downloaded files to reduce bandwidth costs
      // Options considered:
      // - IndexedDB: Large storage (80% of disk) but needs quota management
      // - LocalStorage: Too small (~5-10MB)
      // - Cache API: Good size but needs service worker
      // Libraries available:
      // - Workbox (Google): Full featured, handles quotas + service workers (recommended)
      // - localforage: Simple key-value wrapper for IndexedDB
      // - idb-keyval: Lightweight IndexedDB wrapper
      // - StreamSaver.js: Specialized for large file downloads
      // Recommendation: Use Workbox - handles quota management, cache expiration,
      // and service worker setup. Implement after presigned URL work is complete.

      // Add response header to prompt browser to download the file
      const reqParams = {
        "response-content-disposition": `attachment; filename="${fileName
          .split("/")
          .pop()}"`,
      };

      return await this.client.presignedGetObject(
        this.bucket,
        fileName,
        expiryInSeconds,
        reqParams
      );
    } catch (error) {
      console.error("Failed to get file URL:", error);
      throw new Error("Failed to get file URL");
    }
  }

  async getObject(fileName: string): Promise<internal.Readable> {
    try {
      const stream = await this.client.getObject(this.bucket, fileName);

      // Set up error handling on the stream
      stream.on("error", (err) => {
        console.error("Error in MinIO stream:", err);
      });

      return stream;
    } catch (error) {
      console.error("Failed to get object from MinIO:", error);
      throw error;
    }
  }
}
