import { z } from "zod";
export declare const StorageConfigSchema: z.ZodObject<{
    endpoint: z.ZodString;
    port: z.ZodNumber;
    useSSL: z.ZodBoolean;
    accessKey: z.ZodString;
    secretKey: z.ZodString;
    bucket: z.ZodString;
}, "strip", z.ZodTypeAny, {
    endpoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucket: string;
}, {
    endpoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucket: string;
}>;
export type StorageConfig = z.infer<typeof StorageConfigSchema>;
export declare class StorageService {
    private client;
    private bucket;
    constructor(config: StorageConfig);
    initialize(): Promise<void>;
    uploadFile(file: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
    }, prefix?: string): Promise<string>;
    deleteFile(fileName: string): Promise<void>;
    getFileUrl(fileName: string, expiryInSeconds?: number): Promise<string>;
}
