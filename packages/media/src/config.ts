import { z } from "zod";

export const ServerConfigSchema = z.object({
  port: z.number().default(3002),
  // TODO: Remove jwtSecret if we don't need it
  jwtSecret: z.string().default("your-secret-key"),
});

export const ToolsConfigSchema = z.object({
  exportToWavPath: z.string().default("/usr/local/bin/export-to-wav"),
});

export const SharedConfigSchema = z.object({
  server: ServerConfigSchema,
  tools: ToolsConfigSchema,
});

export type ToolsConfig = z.infer<typeof ToolsConfigSchema>;
export type SharedConfig = z.infer<typeof SharedConfigSchema>;

function loadConfig(): SharedConfig {
  return SharedConfigSchema.parse({
    server: {
      port: parseInt(process.env.PORT || "3001"),
      jwtSecret: process.env.JWT_SECRET || "your-secret-key",
    },
    tools: {
      exportToWavPath: process.env.EXPORT_TO_WAV_PATH,
    },
  });
}

export const config = loadConfig();
