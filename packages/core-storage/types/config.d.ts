import { z } from "zod";
export declare const StorageConfigSchema: z.ZodObject<{
    endpoint: z.ZodDefault<z.ZodString>;
    port: z.ZodDefault<z.ZodNumber>;
    useSSL: z.ZodDefault<z.ZodEffects<z.ZodBoolean, boolean, unknown>>;
    accessKey: z.ZodDefault<z.ZodString>;
    secretKey: z.ZodDefault<z.ZodString>;
    bucket: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    endpoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucket: string;
}, {
    endpoint?: string | undefined;
    port?: number | undefined;
    useSSL?: unknown;
    accessKey?: string | undefined;
    secretKey?: string | undefined;
    bucket?: string | undefined;
}>;
export declare const DatabaseConfigSchema: z.ZodObject<{
    url: z.ZodDefault<z.ZodString>;
    debug: z.ZodDefault<z.ZodEffects<z.ZodBoolean, boolean, unknown>>;
}, "strip", z.ZodTypeAny, {
    url: string;
    debug: boolean;
}, {
    url?: string | undefined;
    debug?: unknown;
}>;
export declare const RedisConfigSchema: z.ZodObject<{
    host: z.ZodDefault<z.ZodString>;
    port: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    port: number;
    host: string;
}, {
    port?: number | undefined;
    host?: string | undefined;
}>;
export declare const SharedConfigSchema: z.ZodObject<{
    storage: z.ZodObject<{
        endpoint: z.ZodDefault<z.ZodString>;
        port: z.ZodDefault<z.ZodNumber>;
        useSSL: z.ZodDefault<z.ZodEffects<z.ZodBoolean, boolean, unknown>>;
        accessKey: z.ZodDefault<z.ZodString>;
        secretKey: z.ZodDefault<z.ZodString>;
        bucket: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        endpoint: string;
        port: number;
        useSSL: boolean;
        accessKey: string;
        secretKey: string;
        bucket: string;
    }, {
        endpoint?: string | undefined;
        port?: number | undefined;
        useSSL?: unknown;
        accessKey?: string | undefined;
        secretKey?: string | undefined;
        bucket?: string | undefined;
    }>;
    database: z.ZodObject<{
        url: z.ZodDefault<z.ZodString>;
        debug: z.ZodDefault<z.ZodEffects<z.ZodBoolean, boolean, unknown>>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        debug: boolean;
    }, {
        url?: string | undefined;
        debug?: unknown;
    }>;
    redis: z.ZodObject<{
        host: z.ZodDefault<z.ZodString>;
        port: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        port: number;
        host: string;
    }, {
        port?: number | undefined;
        host?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    storage: {
        endpoint: string;
        port: number;
        useSSL: boolean;
        accessKey: string;
        secretKey: string;
        bucket: string;
    };
    database: {
        url: string;
        debug: boolean;
    };
    redis: {
        port: number;
        host: string;
    };
}, {
    storage: {
        endpoint?: string | undefined;
        port?: number | undefined;
        useSSL?: unknown;
        accessKey?: string | undefined;
        secretKey?: string | undefined;
        bucket?: string | undefined;
    };
    database: {
        url?: string | undefined;
        debug?: unknown;
    };
    redis: {
        port?: number | undefined;
        host?: string | undefined;
    };
}>;
export type StorageConfig = z.infer<typeof StorageConfigSchema>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type RedisConfig = z.infer<typeof RedisConfigSchema>;
export type SharedConfig = z.infer<typeof SharedConfigSchema>;
export declare const config: {
    storage: {
        endpoint: string;
        port: number;
        useSSL: boolean;
        accessKey: string;
        secretKey: string;
        bucket: string;
    };
    database: {
        url: string;
        debug: boolean;
    };
    redis: {
        port: number;
        host: string;
    };
};
