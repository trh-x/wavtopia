import { Client } from "minio";
import internal from "stream";
import type { StorageConfig } from "../config";

// TODO: Remove the reference to Express.Multer.File from this package
export type StorageFile = Express.Multer.File;

export const DEFAULT_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

export class StorageService {
  private client: Client;
  private bucket: string;
  private accessKey: string;

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
    this.accessKey = config.accessKey;
  }

  async initialize(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);

      // Create bucket if it doesn't exist
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        console.log(`Created bucket: ${this.bucket}`);
      }

      // Apply security policy to new or existing bucket
      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "DenyDirectAccess",
            Effect: "Deny",
            Principal: "*",
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
            Condition: {
              StringNotEquals: {
                "aws:username": this.accessKey,
              },
            },
          },
          {
            Sid: "AllowApplicationAccess",
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
            Condition: {
              StringEquals: {
                "aws:username": this.accessKey,
              },
            },
          },
        ],
      };

      await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy));
      console.log(`Applied security policy to bucket: ${this.bucket}`);
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
    {
      urlExpiryInSeconds = DEFAULT_URL_EXPIRY_SECONDS,
      cacheExpiryInSeconds,
      isAttachment = false,
    }: {
      urlExpiryInSeconds?: number;
      cacheExpiryInSeconds?: number;
      isAttachment?: boolean;
    } = {}
  ): Promise<string> {
    try {
      // Add response header to prompt browser to download the file
      const reqParams = {
        ...(isAttachment && {
          "response-content-disposition": `attachment; filename="${fileName
            .split("/")
            .pop()}"`,
        }),
        ...(cacheExpiryInSeconds && {
          "response-cache-control": `public, max-age=${cacheExpiryInSeconds}`,
        }),
      };

      return await this.client.presignedGetObject(
        this.bucket,
        fileName,
        urlExpiryInSeconds,
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
