import { Router } from "express";
import { z } from "zod";
import { signup, login, getUserById } from "../services/auth";
import { AppError } from "../middleware/errorHandler";
import { authenticate } from "../middleware/auth";

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
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

export { router as authRoutes };
