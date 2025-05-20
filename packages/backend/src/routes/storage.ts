import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { prisma } from "../lib/prisma";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * Get user storage quota and usage information
 */
router.get("/quota", async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        freeQuotaSeconds: true,
        paidQuotaSeconds: true,
        currentUsedQuotaSeconds: true,
        isOverQuota: true,
      },
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    res.json({
      freeQuotaSeconds: user.freeQuotaSeconds,
      paidQuotaSeconds: user.paidQuotaSeconds,
      currentUsedQuotaSeconds: user.currentUsedQuotaSeconds,
      totalQuotaSeconds: user.freeQuotaSeconds + user.paidQuotaSeconds,
      isOverQuota: user.isOverQuota,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
