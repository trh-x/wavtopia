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

// Re-export specific types we want to expose
export {
  Prisma,
  User,
  Role,
  InviteCode,
  FeatureFlag,
  Notification,
  NotificationType,
  AudioFileConversionStatus,
} from ".prisma/client";

export {
  type Track,
  type Component,
  type TrackShare,
  type PaginatedResponse,
  type PaginationParams,
  encodeCursor,
  decodeCursor,
} from "./types";
export * from "./auth";
