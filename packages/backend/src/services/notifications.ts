import { NotificationType, Notification, Role } from "@wavtopia/core-storage";
import { prisma } from "../lib/prisma";

export async function createNotification({
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
}): Promise<Notification> {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      metadata,
    },
  });
}

export async function createNotificationForAllAdmins({
  type,
  title,
  message,
  metadata,
}: {
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}): Promise<Notification[]> {
  // Find all admin users
  const adminUsers = await prisma.user.findMany({
    where: {
      role: Role.ADMIN,
    },
  });

  // Create notifications for each admin
  const notifications = await Promise.all(
    adminUsers.map((admin) =>
      createNotification({
        userId: admin.id,
        type,
        title,
        message,
        metadata,
      })
    )
  );

  return notifications;
}

export async function markNotificationAsRead(
  notificationId: string,
  userId: string
): Promise<Notification> {
  return prisma.notification.update({
    where: {
      id: notificationId,
      userId, // Ensure the notification belongs to the user
    },
    data: {
      isRead: true,
    },
  });
}

export async function markAllNotificationsAsRead(
  userId: string
): Promise<void> {
  await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
}

export async function getUnreadNotificationsCount(
  userId: string
): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}

export async function getUserNotifications(
  userId: string,
  {
    limit = 20,
    offset = 0,
    includeRead = false,
  }: {
    limit?: number;
    offset?: number;
    includeRead?: boolean;
  } = {}
): Promise<Notification[]> {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(includeRead ? {} : { isRead: false }),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    skip: offset,
  });
}
