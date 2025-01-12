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
export * from ".prisma/client";

// Re-export specific types we want to expose
export type {
  User,
  Role,
  Track,
  Component,
  TrackShare,
  FeatureFlag,
  UserFeature,
  InviteCode,
} from ".prisma/client";
