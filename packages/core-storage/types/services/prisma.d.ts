import { PrismaClient } from "@prisma/client";
import { z } from "zod";
export declare const PrismaConfigSchema: z.ZodObject<{
    databaseUrl: z.ZodString;
}, "strip", z.ZodTypeAny, {
    databaseUrl: string;
}, {
    databaseUrl: string;
}>;
export type PrismaConfig = z.infer<typeof PrismaConfigSchema>;
export declare class PrismaService {
    private static instance;
    private client;
    constructor(config: PrismaConfig);
    get db(): PrismaClient;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
}
