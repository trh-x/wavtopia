import { z } from "zod";

export const MinioSetupConfigSchema = z.object({
  rootUser: z.string().min(1, "MINIO_ROOT_USER is required"),
  rootPassword: z.string().min(1, "MINIO_ROOT_PASSWORD is required"),
  user: z.string().min(1, "MINIO_USER is required"),
  password: z.string().min(1, "MINIO_PASSWORD is required"),
  bucket: z.string().min(1, "MINIO_BUCKET is required"),
});

export type MinioSetupConfig = z.infer<typeof MinioSetupConfigSchema>;

function loadMinioSetupConfig(): MinioSetupConfig {
  return MinioSetupConfigSchema.parse({
    rootUser: process.env.MINIO_ROOT_USER,
    rootPassword: process.env.MINIO_ROOT_PASSWORD,
    user: process.env.MINIO_USER,
    password: process.env.MINIO_PASSWORD,
    bucket: process.env.MINIO_BUCKET,
  });
}

export const minioSetupConfig = loadMinioSetupConfig();
