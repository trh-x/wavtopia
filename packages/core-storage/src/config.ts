import { z } from "zod";

export const StorageConfigSchema = z.object({
  endpoint: z.string().default("localhost"),
  port: z.coerce.number().default(9000),
  // TODO: Improve this boolean parsing
  useSSL: z
    .preprocess((val: unknown) => {
      if (typeof val === "string") return val === "true";
      return val;
    }, z.boolean())
    .default(false),
  accessKey: z.string().default("wavtopia"),
  secretKey: z.string().default("wavtopia123"),
  bucket: z.string().default("wavtopia"),
});

export const DatabaseConfigSchema = z.object({
  url: z
    .string()
    .url()
    .default("postgresql://wavtopia:wavtopia@localhost:5432/wavtopia"),
  debug: z
    .preprocess((val: unknown) => {
      if (typeof val === "string") return val === "true";
      return val;
    }, z.boolean())
    .default(false),
});

export const RedisConfigSchema = z.object({
  host: z.string().default("localhost"),
  port: z.coerce.number().default(6379),
  username: z.string().optional(),
  password: z.string().optional(),
});

export const SharedConfigSchema = z.object({
  storage: StorageConfigSchema,
  database: DatabaseConfigSchema,
  redis: RedisConfigSchema,
});

export type StorageConfig = z.infer<typeof StorageConfigSchema>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type RedisConfig = z.infer<typeof RedisConfigSchema>;
export type SharedConfig = z.infer<typeof SharedConfigSchema>;

function loadConfig(): SharedConfig {
  return SharedConfigSchema.parse({
    storage: {
      endpoint: process.env.MINIO_ENDPOINT,
      port: process.env.MINIO_PORT,
      useSSL: process.env.MINIO_USE_SSL,
      accessKey: process.env.MINIO_ROOT_USER,
      secretKey: process.env.MINIO_ROOT_PASSWORD,
      bucket: process.env.MINIO_BUCKET,
    },
    database: {
      url: process.env.DATABASE_URL,
      debug: process.env.DATABASE_DEBUG,
    },
    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
    },
  });
}

export const config = loadConfig();
