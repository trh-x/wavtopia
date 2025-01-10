import { z } from "zod";

export const ServerConfigSchema = z.object({
  port: z.number().default(3000),
  // TODO: Remove jwtSecret if we don't need it
  jwtSecret: z.string().default("your-secret-key"),
});

export const SharedConfigSchema = z.object({
  server: ServerConfigSchema,
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type SharedConfig = z.infer<typeof SharedConfigSchema>;

function loadConfig(): SharedConfig {
  return SharedConfigSchema.parse({
    server: {
      port: parseInt(process.env.PORT || "3000"),
      jwtSecret: process.env.JWT_SECRET || "your-secret-key",
    },
  });
}

export const config = loadConfig();
