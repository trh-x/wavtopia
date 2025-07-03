import type { Notification, PrismaClient } from ".prisma/client";
import { NotificationType, Prisma } from ".prisma/client";
export declare function createNotification({ userId, type, title, message, metadata, }: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, any>;
}, prismaClient: PrismaClient | Prisma.TransactionClient): Promise<Notification>;
