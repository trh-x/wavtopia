import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { prisma } from "../lib/prisma";
import { signup, login, getUserById } from "../services/auth";
import { getEnabledFeatureFlags } from "../services/featureFlags";
import { createNotificationForAllAdmins } from "../services/notifications";

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30),
  password: z.string().min(8),
  inviteCode: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const requestEarlyAccessSchema = z.object({
  email: z.string().email(),
});

router.post("/signup", async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);
    const { user, token } = await signup(data);

    // Don't send the password hash in the response
    const { password, ...userWithoutPassword } = user;
    res.status(201).json({ user: userWithoutPassword, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, "Invalid request data"));
    } else {
      next(error);
    }
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const { user, token } = await login(data);

    // Don't send the password hash in the response
    const { password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, "Invalid request data"));
    } else {
      next(error);
    }
  }
});

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await getUserById(req.user!.id);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    // Don't send the password hash in the response
    const { password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    next(error);
  }
});

// Get all users (excluding sensitive information)
router.get("/users", authenticate, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
      },
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// TODO: Move this out of auth, as the user is not required to be logged in
router.get("/enabled-features", async (req, res, next) => {
  // Get the feature flags that are enabled for the user
  const flags = await getEnabledFeatureFlags(req.user?.id);
  res.json({ flags });
});

router.post("/request-early-access", async (req, res, next) => {
  try {
    const { email } = requestEarlyAccessSchema.parse(req.body);

    // Check if this email has already requested access
    const existingRequest = await prisma.earlyAccessRequest.findUnique({
      where: { email },
    });

    if (existingRequest) {
      // Don't reveal if they've already requested, just say thanks
      return res.json({ success: true });
    }

    // Create new request
    const request = await prisma.earlyAccessRequest.create({
      data: {
        email,
        status: "PENDING",
      },
    });

    // Create notifications for all admin users
    await createNotificationForAllAdmins({
      type: "EARLY_ACCESS_REQUEST",
      title: "New Early Access Request",
      message: `A new early access request has been submitted by ${email}`,
      metadata: {
        requestId: request.id,
        email: request.email,
      },
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, "Invalid email address"));
    } else {
      next(error);
    }
  }
});

export { router as authRoutes };
