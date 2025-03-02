import { Router } from "express";
import { Role } from "@wavtopia/core-storage";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

// Require admin access for all routes
router.use(authenticate, requireRole(Role.ADMIN));

// Feature Flags
router.get("/feature-flags", async (req, res) => {
  const flags = await prisma.featureFlag.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json({ flags });
});

router.post("/feature-flags", async (req, res) => {
  const { name, description, isEnabled } = req.body;
  const flag = await prisma.featureFlag.create({
    data: {
      name,
      description,
      isEnabled: isEnabled ?? false,
    },
  });
  res.json(flag);
});

router.patch("/feature-flags/:id", async (req, res) => {
  const { id } = req.params;
  const { isEnabled, description } = req.body;
  const flag = await prisma.featureFlag.update({
    where: { id },
    data: { isEnabled, description },
  });
  res.json(flag);
});

// Invite Codes
router.get("/invite-codes", async (req, res) => {
  const codes = await prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json({ codes });
});

router.post("/invite-codes", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { maxUses, expiresAt, reference } = req.body;
  const code = await prisma.inviteCode.create({
    data: {
      code: generateInviteCode(),
      maxUses: maxUses ?? 1,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      reference: reference || null,
      createdBy: req.user.id,
    },
  });
  res.json(code);
});

router.patch("/invite-codes/:id", async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  const code = await prisma.inviteCode.update({
    where: { id },
    data: { isActive },
  });
  res.json(code);
});

// Helper function to generate a random invite code
function generateInviteCode(length = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default router;
