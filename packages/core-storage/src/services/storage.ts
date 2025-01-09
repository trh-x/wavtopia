import { Client } from "minio";
import { z } from "zod";

export const StorageConfigSchema = z.object({
  endpoint: z.string(),
  port: z.number(),
  useSSL: z.boolean(),
  accessKey: z.string(),
  secretKey: z.string(),
  bucket: z.string(),
});

export type StorageConfig = z.infer<typeof StorageConfigSchema>;

export class StorageService {
  private client: Client;
  private bucket: string;

  constructor(config: StorageConfig) {
    StorageConfigSchema.parse(config);

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

  async uploadFile(
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
    },
    prefix: string = ""
  ): Promise<string> {
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
      return await this.client.presignedGetObject(
        this.bucket,
        fileName,
        expiryInSeconds
      );
    } catch (error) {
      console.error("Failed to get file URL:", error);
      throw new Error("Failed to get file URL");
    }
  }
}
