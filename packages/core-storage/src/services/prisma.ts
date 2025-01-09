import { PrismaClient } from "@prisma/client";
import { z } from "zod";

export const PrismaConfigSchema = z.object({
  databaseUrl: z.string().url(),
});

export type PrismaConfig = z.infer<typeof PrismaConfigSchema>;

export class PrismaService {
  private static instance: PrismaClient | null = null;
  private client: PrismaClient;

  constructor(config: PrismaConfig) {
    PrismaConfigSchema.parse(config);

    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaClient({
        datasources: {
          db: {
            url: config.databaseUrl,
          },
        },
      });
    }

    this.client = PrismaService.instance;
  }

  get db(): PrismaClient {
    return this.client;
  }

  async connect(): Promise<void> {
    try {
      await this.client.$connect();
    } catch (error) {
      console.error("Failed to connect to database:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.$disconnect();
    } catch (error) {
      console.error("Failed to disconnect from database:", error);
      throw error;
    }
  }
}
