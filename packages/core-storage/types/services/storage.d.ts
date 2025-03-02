import internal from "stream";
import type { StorageConfig } from "../config";
export type StorageFile = Express.Multer.File;
export declare const DEFAULT_URL_EXPIRY_SECONDS: number;
export declare class StorageService {
    private client;
    private bucket;
    private accessKey;
    constructor(config: StorageConfig);
    initialize(): Promise<void>;
    uploadFile(file: StorageFile, prefix?: string): Promise<string>;
    deleteFile(fileName: string): Promise<void>;
    getFileUrl(fileName: string, { urlExpiryInSeconds, cacheExpiryInSeconds, isAttachment, }?: {
        urlExpiryInSeconds?: number;
        cacheExpiryInSeconds?: number;
        isAttachment?: boolean;
    }): Promise<string>;
    getObject(fileName: string): Promise<internal.Readable>;
}
