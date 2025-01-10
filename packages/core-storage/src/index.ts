export { StorageService, type StorageFile } from "./services/storage";
export { PrismaService } from "./services/prisma";
export {
  deleteLocalFile,
  ensureDirectoryExists,
  normalizeFilePath,
} from "./services/local-storage";
export {
  config,
  type StorageConfig,
  type DatabaseConfig,
  type RedisConfig,
  type SharedConfig,
} from "./config";

// Re-export types from @prisma/client for convenience
export { Prisma, Role, User } from ".prisma/client";
