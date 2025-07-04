import type { Notification, PrismaClient, User } from ".prisma/client";
import { NotificationType, Prisma } from ".prisma/client";
import { createNotification } from "./notifications";
import { formatSeconds } from "../utils/formatSeconds";

interface StorageUser {
  id: string;
  currentUsedQuotaSeconds: number;
  freeQuotaSeconds: number;
  paidQuotaSeconds: number;
  isOverQuota: boolean;
}

export type UpdateStorageParams = {
  secondsChange: number;
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
            currentUsedQuotaSeconds: true,
            freeQuotaSeconds: true,
            paidQuotaSeconds: true,
            isOverQuota: true,
          },
        });

  const totalQuotaSeconds =
    initialUser.freeQuotaSeconds + initialUser.paidQuotaSeconds;
  const newTotalUsage =
    initialUser.currentUsedQuotaSeconds + params.secondsChange;
  const isOverQuota = newTotalUsage > totalQuotaSeconds;

  // Update the user's storage usage
  const user = await prismaClient.user.update({
    where: { id: initialUser.id },
    data: {
      currentUsedQuotaSeconds: newTotalUsage,
      isOverQuota,
    },
  });

  // Create a notification if the user just went over quota
  if (isOverQuota && !initialUser.isOverQuota) {
    const notification = await createNotification(
      {
        userId: user.id,
        type: NotificationType.STORAGE_QUOTA_WARNING,
        title: "Storage Quota Warning",
        message: `You have exceeded your storage quota of ${formatSeconds(
          totalQuotaSeconds
        )}. Your current usage is ${formatSeconds(
          newTotalUsage
        )}. Please free up some space to continue uploading.`,
        // TODO: ", or upgrade your account."
        metadata: {
          currentUsage: newTotalUsage,
          quota: totalQuotaSeconds,
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
