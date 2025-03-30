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
  // Seed faker with name for consistent results
  const seed = getStringSeed(name);
  faker.seed(seed);
  // 60% chance of having stats (increased from 40%)
  return faker.number.int({ min: 1, max: 10 }) <= 6;
}

export function getEngagementLevel(name: string): EngagementStats {
  // Seed faker with name for consistent results, but add more variation
  const seed = getStringSeed(name);
  faker.seed(seed * 31); // Use a prime multiplier to get better distribution

  // Generate engagement levels with weighted distribution:
  // Level 1 (1-9): 30% chance
  // Level 2 (10-49): 40% chance
  // Level 3 (50+): 30% chance
  const roll = faker.number.int({ min: 1, max: 100 });
  const level = roll <= 30 ? 1 : roll <= 70 ? 2 : 3;

  switch (level) {
    case 1: {
      const total = faker.number.int({ min: 3, max: 9 }); // Minimum 3 total engagements
      const plays = faker.number.int({ min: 2, max: total }); // At least 2 plays
      return { plays, downloads: total - plays };
    }
    case 2: {
      const total = faker.number.int({ min: 15, max: 49 }); // Increased minimum
      const plays = faker.number.int({ min: 10, max: total }); // More plays
      return { plays, downloads: total - plays };
    }
    case 3:
    default: {
      const total = faker.number.int({ min: 50, max: 500 }); // Increased max for more variation
      const plays = Math.floor(
        total * faker.number.float({ min: 0.6, max: 0.8 })
      ); // 60-80% plays
      return { plays, downloads: total - plays };
    }
  }
}

// Get a deterministic subset of users for a track
export function getTrackUsers(
  trackName: string
): Array<(typeof TEST_USERS)[number]> {
  const seed = getStringSeed(trackName);
  faker.seed(seed);

  // More popular tracks (higher engagement) get more users
  const { plays, downloads } = getEngagementLevel(trackName);
  const totalEngagement = plays + downloads;

  if (totalEngagement === 0) return [];

  // Number of users based on engagement level
  const userCount =
    totalEngagement < 10 ? 1 : totalEngagement < 50 ? 2 : TEST_USERS.length;

  return faker.helpers.shuffle([...TEST_USERS]).slice(0, userCount);
}
