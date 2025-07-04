export declare const TEST_USERS: readonly [{
    readonly username: "alice";
    readonly email: "alice@test.com";
}, {
    readonly username: "bob";
    readonly email: "bob@test.com";
}, {
    readonly username: "charlie";
    readonly email: "charlie@test.com";
}, {
    readonly username: "diana";
    readonly email: "diana@test.com";
}];
export declare function ensureTestUsers(): Promise<void>;
export declare function getTestUsers(): Promise<{
    username: string;
    password: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    role: import(".prisma/client").$Enums.Role;
    inviteCodeId: string | null;
    freeQuotaSeconds: number;
    paidQuotaSeconds: number;
    currentUsedQuotaSeconds: number;
    isOverQuota: boolean;
}[]>;
