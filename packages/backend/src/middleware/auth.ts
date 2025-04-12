import { Request, Response, NextFunction } from "express";
import { Role } from "@wavtopia/core-storage";
import { verifyToken, getUserById } from "../services/auth";
import { AppError } from "./errorHandler";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        isOverStorageQuota: boolean;
        usedStorageBytes: number;
        extraQuotaBytes: number;
        freeQuotaBytes: number;
      };
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new AppError(401, "No token provided");
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);

    const user = await getUserById(payload.userId);
    if (!user) {
      throw new AppError(401, "User not found");
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, "Authentication required"));
    }

    if (req.user.role !== role && req.user.role !== Role.ADMIN) {
      return next(new AppError(403, "Insufficient permissions"));
    }

    next();
  };
}
