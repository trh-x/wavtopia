import { PrismaClient, Prisma } from ".prisma/client";
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
        // Enable query logging only when debug is true
        ...(config.debug && {
          log: [
            {
              emit: "event",
              level: "query",
            },
          ],
        }),
      });

      // Log all SQL queries only when debug is true
      if (config.debug) {
        PrismaService.instance.$on("query" as never, (e: Prisma.QueryEvent) => {
          console.log("Query: " + e.query);
          console.log("Params: " + e.params);
          console.log("Duration: " + e.duration + "ms");
        });
      }
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
