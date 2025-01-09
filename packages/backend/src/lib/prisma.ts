import { PrismaService } from "@wavtopia/core-storage";
import config from "../config";

declare global {
  var prismaService: PrismaService | undefined;
}

// Prevent multiple instances of Prisma Client in development
export const prismaService =
  global.prismaService ||
  new PrismaService({
    databaseUrl: config.database.url,
  });

export const prisma = prismaService.db;

if (process.env.NODE_ENV !== "production") {
  global.prismaService = prismaService;
}
