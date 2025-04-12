import type { Notification, PrismaClient, User } from ".prisma/client";
import { Prisma } from ".prisma/client";
interface StorageUser {
    id: string;
    usedStorageBytes: number;
    freeQuotaBytes: number;
    extraQuotaBytes: number;
    isOverStorageQuota: boolean;
}
export type UpdateStorageParams = {
    bytesToAdd: number;
} & ({
    user: StorageUser;
} | {
    userId: string;
});
export interface StorageUpdateResult {
    user: User;
    notification?: Notification;
}
/**
 * Updates a user's storage usage and checks quota status
 * @param params The parameters for updating storage
 * @param prismaClient A PrismaClient instance or transaction client from PrismaService
 */
export declare function updateUserStorage(params: UpdateStorageParams, prismaClient: PrismaClient | Prisma.TransactionClient): Promise<StorageUpdateResult>;
export {};
