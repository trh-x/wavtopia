import { User, Role, InviteCode } from "@wavtopia/core-storage";
import { hashPassword, comparePassword } from "@wavtopia/core-storage";
import { prisma } from "../lib/prisma";
import jwt from "jsonwebtoken";
import { AppError } from "../middleware/errorHandler";
import { isEarlyAccessRequired } from "./featureFlags";
import { config } from "../config";
import { getDefaultFreeQuota } from "./storage";

interface UserSignupData {
  email: string;
  username: string;
  password: string;
  inviteCode?: string;
}

interface UserLoginData {
  email: string;
  password: string;
}

interface JWTPayload {
  userId: string;
  role: Role;
}

export async function signup(
  data: UserSignupData
): Promise<{ user: User; token: string }> {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: data.email }, { username: data.username }],
    },
  });

  if (existingUser) {
    throw new AppError(400, "Email or username already exists");
  }

  // Check if early access is required
  const earlyAccessRequired = await isEarlyAccessRequired();

  let inviteCode: InviteCode | null = null;

  if (earlyAccessRequired) {
    if (!data.inviteCode) {
      throw new AppError(400, "Invite code is required for registration");
    }

    inviteCode = await prisma.inviteCode.findUnique({
      where: { code: data.inviteCode },
    });

    if (!inviteCode || !inviteCode.isActive) {
      throw new AppError(400, "Invalid invite code");
    }

    if (inviteCode.maxUses > 0 && inviteCode.usedCount >= inviteCode.maxUses) {
      throw new AppError(400, "Invite code has reached maximum usage");
    }

    if (inviteCode.expiresAt && inviteCode.expiresAt < new Date()) {
      throw new AppError(400, "Invite code has expired");
    }
  }

  const hashedPassword = await hashPassword(data.password);
  const freeQuotaSeconds = await getDefaultFreeQuota();

  const userData: any = {
    email: data.email,
    username: data.username,
    password: hashedPassword,
    freeQuotaSeconds,
  };

  // If invite code was provided and validated, link it to the user
  if (inviteCode) {
    userData.inviteCodeId = inviteCode.id;
  }

  try {
    const user = await prisma.user.create({ data: userData });

    if (inviteCode) {
      // Update the usage count
      await prisma.inviteCode.update({
        where: { id: inviteCode.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    const token = generateToken(user);
    return { user, token };
  } catch (error) {
    console.error("Error creating user:", error);
    throw new AppError(500, "Failed to create user");
  }
}

export async function login(
  data: UserLoginData
): Promise<{ user: User; token: string }> {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new AppError(401, "Invalid credentials");
  }

  const isValidPassword = await comparePassword(data.password, user.password);
  if (!isValidPassword) {
    throw new AppError(401, "Invalid credentials");
  }

  const token = generateToken(user);
  return { user, token };
}

export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    role: user.role,
  };

  return jwt.sign(payload, config.server.jwtSecret, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, config.server.jwtSecret) as JWTPayload;
  } catch (error) {
    throw new AppError(401, "Invalid token");
  }
}

export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  });
}
