import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();

/**
 * Get all enabled licenses
 * GET /licenses
 */
router.get("/", authenticate, async (req, res) => {
  const licenses = await prisma.license.findMany({
    where: {
      enabled: true,
    },
    orderBy: {
      type: "asc",
    },
  });

  res.json(licenses);
});

export default router;
