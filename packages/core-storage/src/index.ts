export {
  DEFAULT_URL_EXPIRY_SECONDS,
  StorageService,
  type StorageFile,
} from "./services/storage";
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
  SourceFormat,
  TrackStatus,
  InviteCode,
  FeatureFlag,
  Notification,
  NotificationType,
  AudioFileConversionStatus,
  DatePrecision,
  License,
  LicenseType,
  // Track event and format types
  TrackEventType,
  PlaybackSource,
  AudioFormat,
  TrackEvent,
  UserTrackActivity,
} from ".prisma/client";

export {
  type Track,
  type Stem,
  type TrackShare,
  type Genre,
  type PaginatedResponse,
  type PaginationParams,
  type TrackUsageResponse,
  encodeCursor,
  decodeCursor,
} from "./types";
export * from "./auth";
