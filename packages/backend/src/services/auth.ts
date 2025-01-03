import { PrismaClient, User, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppError } from "../middleware/errorHandler";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const SALT_ROUNDS = 10;

interface UserSignupData {
  email: string;
  username: string;
  password: string;
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

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      username: data.username,
      password: hashedPassword,
    },
  });

  const token = generateToken(user);
  return { user, token };
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

  const isValidPassword = await bcrypt.compare(data.password, user.password);
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

  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new AppError(401, "Invalid token");
  }
}

export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  });
}
