import { z } from "zod";

export const ServerConfigSchema = z.object({
  port: z.number().default(3002),
  jwtSecret: z.string().default("your-secret-key"),
});

export const ServicesConfigSchema = z.object({
  mediaServiceUrl: z.string().url().default("http://localhost:3001"),
});

export const SharedConfigSchema = z.object({
  server: ServerConfigSchema,
  services: ServicesConfigSchema,
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type ServicesConfig = z.infer<typeof ServicesConfigSchema>;
export type SharedConfig = z.infer<typeof SharedConfigSchema>;

function loadConfig(): SharedConfig {
  return SharedConfigSchema.parse({
    server: {
      port: parseInt(process.env.PORT || "3002"),
      jwtSecret: process.env.JWT_SECRET || "your-secret-key",
    },
    services: {
      mediaServiceUrl: process.env.MEDIA_SERVICE_URL || "http://localhost:3001",
    },
  });
}

export const config = loadConfig();
