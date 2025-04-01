import { faker } from "@faker-js/faker";
import { EngagementStats } from "./types";
import { TEST_USERS } from "./test-users";

// Check if an item has existing stats
export function hasExistingStats(plays: number, downloads: number): boolean {
  return plays > 0 || downloads > 0;
}

// Use string as seed for consistent random generation
export function getStringSeed(str: string): number {
  return Array.from(str).reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

export function shouldHaveStats(name: string): boolean {
  // Use a different prime for each type of randomization
  const seed = getStringSeed(name) * 17;
  faker.seed(seed);
  // 60% chance of having stats
  return faker.number.int({ min: 1, max: 10 }) <= 6;
}

export function getEngagementLevel(name: string): EngagementStats {
  // Use a different prime for engagement levels
  const seed = getStringSeed(name) * 31;
  faker.seed(seed);

  // Generate engagement levels with weighted distribution:
  // Level 1 (1-9): 30% chance
  // Level 2 (10-49): 40% chance
  // Level 3 (50+): 30% chance
  const roll = faker.number.int({ min: 1, max: 100 });
  const level = roll <= 30 ? 1 : roll <= 70 ? 2 : 3;

  switch (level) {
    case 1: {
      const total = faker.number.int({ min: 3, max: 9 });
      const plays = faker.number.int({ min: 2, max: total });
      return { plays, downloads: total - plays };
    }
    case 2: {
      const total = faker.number.int({ min: 15, max: 49 });
      const plays = faker.number.int({ min: 10, max: total });
      return { plays, downloads: total - plays };
    }
    case 3:
    default: {
      const total = faker.number.int({ min: 50, max: 500 });
      const plays = Math.floor(
        total * faker.number.float({ min: 0.6, max: 0.8 })
      );
      return { plays, downloads: total - plays };
    }
  }
}

interface UserDistribution {
  userCount: number;
  userSeed: number;
}

// Get distribution info for users based on engagement level
export function getUserDistribution(
  name: string,
  totalEngagement: number
): UserDistribution {
  // Use a different prime for user distribution
  const seed = getStringSeed(name) * 41;

  return {
    userCount:
      totalEngagement < 10 ? 1 : totalEngagement < 50 ? 2 : TEST_USERS.length,
    userSeed: seed,
  };
}

// Get a deterministic subset of users for a track
export function getTrackUsers(
  name: string,
  totalEngagement: number
): Array<(typeof TEST_USERS)[number]> {
  if (totalEngagement === 0) return [];

  const { userCount, userSeed } = getUserDistribution(name, totalEngagement);
  faker.seed(userSeed);

  return faker.helpers.shuffle([...TEST_USERS]).slice(0, userCount);
}

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

export function generatePlayDates(plays: number, seed: number): PlayDates {
  faker.seed(seed);

  // Calculate date ranges based on engagement level
  const daysAgo = plays > 25 ? 7 : plays > 5 ? 30 : 90;

  // Generate last played date first
  const lastPlayedAt = faker.date.recent({ days: daysAgo });

  // Calculate minimum gap based on play count (more plays = more time needed)
  const minGapDays = Math.max(plays / 10, 1); // At least 1 day gap

  // Generate first played date ensuring it's before last played
  const maxPastDays = Math.min(365, daysAgo * 2); // Cap at 1 year or 2x daysAgo
  const firstPlayedAt = faker.date.past({
    years: maxPastDays / 365,
    refDate: new Date(
      lastPlayedAt.getTime() - minGapDays * 24 * 60 * 60 * 1000
    ),
  });

  return {
    firstPlayedAt,
    lastPlayedAt,
  };
}
