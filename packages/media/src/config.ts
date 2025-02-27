import { z } from "zod";

export const ServerConfigSchema = z.object({
  port: z.number().default(3002),
});

export const ToolsConfigSchema = z.object({
  milkyCliPath: z.string().default("/usr/local/bin/milkycli"),
  schismTrackerPath: z.string().default("/usr/local/bin/schismtracker"),
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
    },
    tools: {
      milkyCliPath: process.env.MILKYCLI_PATH,
      schismTrackerPath: process.env.SCHISMTRACKER_PATH,
    },
  });
}

export const config = loadConfig();
