import { PrismaClient } from ".prisma/client";
import type { DatabaseConfig } from "../config";

export class PrismaService {
  private static instance: PrismaClient | null = null;
  private client: PrismaClient;

  constructor(config: DatabaseConfig) {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaClient({
        datasources: {
          db: {
            url: config.url,
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
