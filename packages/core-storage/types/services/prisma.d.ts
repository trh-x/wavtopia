import { PrismaClient } from ".prisma/client";
import type { DatabaseConfig } from "../config";
export declare class PrismaService {
    private static instance;
    private client;
    constructor(config: DatabaseConfig);
    get db(): PrismaClient;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
}
