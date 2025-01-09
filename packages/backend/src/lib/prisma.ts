import { PrismaClient } from "@prisma/client";
import config from "../config";

declare global {
  var prisma: PrismaClient | undefined;
}

// Prevent multiple instances of Prisma Client in development
// due to hot reloading creating new instances
export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: config.database.url,
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
