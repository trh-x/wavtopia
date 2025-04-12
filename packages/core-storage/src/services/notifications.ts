import type { Notification, PrismaClient, User } from ".prisma/client";
import { NotificationType, Prisma } from ".prisma/client";

export async function createNotification(
  {
    userId,
    type,
    title,
    message,
    metadata,
  }: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, any>;
  },
  prismaClient: PrismaClient | Prisma.TransactionClient
): Promise<Notification> {
  return prismaClient.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      metadata,
    },
  });
}
