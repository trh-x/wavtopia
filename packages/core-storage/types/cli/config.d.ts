import { z } from "zod";
export declare const MinioSetupConfigSchema: z.ZodObject<{
    rootUser: z.ZodString;
    rootPassword: z.ZodString;
    user: z.ZodString;
    password: z.ZodString;
    bucket: z.ZodString;
}, "strip", z.ZodTypeAny, {
    bucket: string;
    password: string;
    user: string;
    rootUser: string;
    rootPassword: string;
}, {
    bucket: string;
    password: string;
    user: string;
    rootUser: string;
    rootPassword: string;
}>;
export type MinioSetupConfig = z.infer<typeof MinioSetupConfigSchema>;
export declare const minioSetupConfig: {
    bucket: string;
    password: string;
    user: string;
    rootUser: string;
    rootPassword: string;
};
