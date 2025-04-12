import { PrismaService, config } from "@wavtopia/core-storage";

declare global {
  var prismaService: PrismaService;
}

// Prevent multiple instances of Prisma Client in development
export const prismaService =
  global.prismaService || new PrismaService(config.database);

export const prisma = prismaService.db;

if (process.env.NODE_ENV !== "production") {
  global.prismaService = prismaService;
}
