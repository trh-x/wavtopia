import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationsCount,
} from "../services/notifications";

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Get user's notifications
router.get("/", async (req, res, next) => {
  try {
    const { limit, offset, includeRead } = req.query;
    const notifications = await getUserNotifications(req.user!.id, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      includeRead: includeRead === "true",
    });
    res.json({ notifications });
  } catch (error) {
    next(error);
  }
});

// Get unread count
router.get("/unread-count", async (req, res, next) => {
  try {
    const count = await getUnreadNotificationsCount(req.user!.id);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// Mark a notification as read
router.post("/:id/read", async (req, res, next) => {
  try {
    const notification = await markNotificationAsRead(
      req.params.id,
      req.user!.id
    );
    res.json({ notification });
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read
router.post("/mark-all-read", async (req, res, next) => {
  try {
    await markAllNotificationsAsRead(req.user!.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export { router as notificationRoutes };
