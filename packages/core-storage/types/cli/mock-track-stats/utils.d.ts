import { EngagementStats } from "./types";
import { TEST_USERS } from "./test-users";
export declare function hasExistingStats(plays: number, downloads: number): boolean;
export declare function getStringSeed(str: string): number;
export declare function shouldHaveStats(name: string): boolean;
export declare function getEngagementLevel(name: string): EngagementStats;
interface UserDistribution {
    userCount: number;
    userSeed: number;
}
export declare function getUserDistribution(name: string, totalEngagement: number): UserDistribution;
export declare function getTrackUsers(name: string, totalEngagement: number): Array<(typeof TEST_USERS)[number]>;
/**
 * Prime numbers used for seed generation to ensure unique but deterministic randomization:
 * - 53: Base prime for general seeding
 * - 59: Used for stem activity to avoid correlation with track activity
 * - 61: Used for user distribution to avoid correlation with activity generation
 * - 67: Used for engagement level calculation
 * - 71: Used for plays distribution
 * - 73: Used for downloads distribution
 */
/**
 * Generates consistent first and last played dates based on engagement metrics
 * Ensures firstPlayedAt is always before lastPlayedAt
 */
interface PlayDates {
    firstPlayedAt: Date;
    lastPlayedAt: Date;
}
export declare function generatePlayDates(plays: number, seed: number): PlayDates;
export {};
