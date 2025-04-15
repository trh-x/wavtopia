import type { Notification, PrismaClient, User } from ".prisma/client";
import { NotificationType, Prisma } from ".prisma/client";
import { createNotification } from "./notifications";
import { formatBytes } from "../utils/formatBytes";

interface StorageUser {
  id: string;
  usedStorageBytes: number;
  freeQuotaBytes: number;
  extraQuotaBytes: number;
  isOverStorageQuota: boolean;
}

export type UpdateStorageParams = {
  bytesChange: number;
} & ({ user: StorageUser } | { userId: string });

export interface StorageUpdateResult {
  user: User;
  notification?: Notification;
}

/**
 * Updates a user's storage usage and checks quota status
 * @param params The parameters for updating storage
 * @param prismaClient A PrismaClient instance or transaction client from PrismaService
 */
export async function updateUserStorage(
  params: UpdateStorageParams,
  prismaClient: PrismaClient | Prisma.TransactionClient
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
            isOverStorageQuota: true,
          },
        });

  const totalQuotaBytes =
    initialUser.freeQuotaBytes + initialUser.extraQuotaBytes;
  const newTotalUsage = initialUser.usedStorageBytes + params.bytesChange;
  const isOverQuota = newTotalUsage > totalQuotaBytes;

  // Update the user's storage usage
  const user = await prismaClient.user.update({
    where: { id: initialUser.id },
    data: {
      usedStorageBytes: newTotalUsage,
      isOverStorageQuota: isOverQuota,
    },
  });

  // Create a notification if the user just went over quota
  if (isOverQuota && !initialUser.isOverStorageQuota) {
    const notification = await createNotification(
      {
        userId: user.id,
        type: NotificationType.STORAGE_QUOTA_WARNING,
        title: "Storage Quota Warning",
        message: `You have exceeded your storage quota of ${formatBytes(
          totalQuotaBytes
        )}. Your current usage is ${formatBytes(
          newTotalUsage
        )}. Please free up some space to continue uploading.`,
        // TODO: ", or upgrade your account."
        metadata: {
          currentUsage: newTotalUsage,
          quota: totalQuotaBytes,
        },
      },
      prismaClient
    );

    return {
      user,
      notification,
    };
  }

  return {
    user,
  };
}
