import {
  DEFAULT_URL_EXPIRY_SECONDS,
  StorageService,
  config,
  User,
} from "@wavtopia/core-storage";
import { config as backendConfig } from "../config";
import { AppError } from "../middleware/errorHandler";
import internal from "stream";
import { prisma, PrismaTransactionClient } from "../lib/prisma";

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

interface StorageUser {
  id: string;
  usedStorageBytes: number;
  freeQuotaBytes: number;
  extraQuotaBytes: number;
}

interface QuotaWarning {
  message: string;
  currentUsage: number;
  quota: number;
}

interface StorageUpdateResult {
  user: User;
  quotaWarning?: QuotaWarning;
}

type UpdateStorageParams = {
  bytesToAdd: number;
} & ({ user: StorageUser } | { userId: string });

/**
 * Updates a user's storage usage and checks quota status
 */
export async function updateUserStorage(
  params: UpdateStorageParams,
  prismaClient: typeof prisma | PrismaTransactionClient = prisma
): Promise<StorageUpdateResult> {
  // Get initial user state either from params or by fetching
  const initialUser =
    "user" in params
      ? params.user
      : await prismaClient.user.findUniqueOrThrow({
          where: { id: params.userId },
          select: {
            id: true,
            usedStorageBytes: true,
            freeQuotaBytes: true,
            extraQuotaBytes: true,
          },
        });

  const totalQuotaBytes =
    initialUser.freeQuotaBytes + initialUser.extraQuotaBytes;
  const newTotalUsage = initialUser.usedStorageBytes + params.bytesToAdd;
  const isOverQuota = newTotalUsage > totalQuotaBytes;

  // Update the user's storage usage
  const user = await prismaClient.user.update({
    where: { id: initialUser.id },
    data: {
      usedStorageBytes: newTotalUsage,
      isOverStorageQuota: isOverQuota,
    },
  });

  const quotaWarning = isOverQuota
    ? {
        message:
          "You have exceeded your storage quota. Please free up some space before uploading more.",
        currentUsage: newTotalUsage,
        quota: totalQuotaBytes,
      }
    : undefined;

  return {
    user,
    quotaWarning,
  };
}

/**
 * Gets the default free storage quota from system settings
 */
export async function getDefaultFreeQuota(): Promise<number> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "FREE_STORAGE_QUOTA_BYTES" },
    select: { numberValue: true },
  });

  if (!setting?.numberValue) {
    throw new Error("System storage quota not configured");
  }

  return Number(setting.numberValue);
}
