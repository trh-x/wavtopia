import { z } from "zod";

export const ToolsConfigSchema = z.object({
  exportToWavPath: z.string().default("/usr/local/bin/export-to-wav"),
});

export const SharedConfigSchema = z.object({
  tools: ToolsConfigSchema,
});

export type ToolsConfig = z.infer<typeof ToolsConfigSchema>;
export type SharedConfig = z.infer<typeof SharedConfigSchema>;

function loadConfig(): SharedConfig {
  return SharedConfigSchema.parse({
    tools: {
      exportToWavPath: process.env.EXPORT_TO_WAV_PATH,
    },
  });
}

export const config = loadConfig();
