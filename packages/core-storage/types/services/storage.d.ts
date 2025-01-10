import type { StorageConfig } from "../config";
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
