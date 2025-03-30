import { PrismaClient } from ".prisma/client";
import { faker } from "@faker-js/faker";
import { AudioFormat } from "./types";
import { getStringSeed, generatePlayDates } from "./utils";

const prisma = new PrismaClient();

// Distribute total plays/downloads across users
function distributeStats(
  total: number,
  userCount: number,
  seed: number
): number[] {
  if (userCount === 1) return [total];
  if (total === 0) return Array(userCount).fill(0);

  faker.seed(seed);
  const distribution = Array(userCount).fill(0);
  let remaining = total;

  // Give each user at least 1 if possible
  if (total >= userCount) {
    distribution.fill(1);
    remaining -= userCount;
  }

  // Randomly distribute remaining
  while (remaining > 0) {
    const idx = faker.number.int({ min: 0, max: userCount - 1 });
    distribution[idx]++;
    remaining--;
  }

  return faker.helpers.shuffle(distribution);
}

// Generate activity for a single user and track
export async function generateUserTrackActivity(
  userId: string,
  trackId: string,
  trackName: string,
  userIndex: number,
  totalPlays: number,
  totalDownloads: number,
  userCount: number
) {
  if (totalPlays === 0 && totalDownloads === 0) return;

  const seed = getStringSeed(trackName + userId) * 53; // Base prime for track activity
  faker.seed(seed);

  // Distribute plays and downloads across users
  const plays = distributeStats(totalPlays, userCount, seed * 71)[userIndex];
  const downloads = distributeStats(totalDownloads, userCount, seed * 73)[
    userIndex
  ];

  if (plays === 0 && downloads === 0) return;

  // Distribute plays between stream and synced
  const streamCount = faker.number.int({ min: 0, max: plays });
  const syncedPlayCount = plays - streamCount;

  // Calculate play times based on engagement
  const avgPlayTime = faker.number.float({ min: 60, max: 180 }); // 1-3m for full tracks
  const totalPlayTime = plays * avgPlayTime;

  // Determine download formats
  const downloadFormats: AudioFormat[] = [];
  if (downloads > 0) {
    if (faker.number.int(10) > 7) downloadFormats.push(AudioFormat.ORIGINAL);
    if (faker.number.int(10) > 5) downloadFormats.push(AudioFormat.WAV);
    if (faker.number.int(10) > 3) downloadFormats.push(AudioFormat.MP3);
    if (faker.number.int(10) > 8) downloadFormats.push(AudioFormat.FLAC);
  }

  // Generate consistent dates
  const { firstPlayedAt, lastPlayedAt } = generatePlayDates(plays, seed * 61);

  try {
    await prisma.userTrackActivity.upsert({
      where: {
        userId_trackId: {
          userId,
          trackId,
        },
      },
      create: {
        userId,
        trackId,
        firstPlayedAt,
        lastPlayedAt,
        playCount: plays,
        streamCount,
        syncedPlayCount,
        totalPlayTime,
        downloadCount: downloads,
        downloadFormats,
      },
      update: {
        lastPlayedAt,
        playCount: plays,
        streamCount,
        syncedPlayCount,
        totalPlayTime,
        downloadCount: downloads,
        downloadFormats,
      },
    });
  } catch (error) {
    console.error(
      `Error updating activity for track ${trackName}, user ${userId}:`,
      error
    );
  }
}

// Generate activity for a single user and stem
export async function generateUserStemActivity(
  userId: string,
  stemId: string,
  stemName: string,
  userIndex: number,
  totalPlays: number,
  totalDownloads: number,
  userCount: number
) {
  if (totalPlays === 0 && totalDownloads === 0) return;

  const seed = getStringSeed(stemName + userId) * 59; // Prime for stem activity
  faker.seed(seed);

  // Distribute plays and downloads across users
  const plays = distributeStats(totalPlays, userCount, seed * 71)[userIndex];
  const downloads = distributeStats(totalDownloads, userCount, seed * 73)[
    userIndex
  ];

  if (plays === 0 && downloads === 0) return;

  // Distribute plays between stream and synced
  const streamCount = faker.number.int({ min: 0, max: plays });
  const syncedPlayCount = plays - streamCount;

  // Calculate play times based on engagement
  const avgPlayTime = faker.number.float({ min: 30, max: 120 }); // 30s-2m for stems
  const totalPlayTime = plays * avgPlayTime;

  // Determine download formats (stems tend to be downloaded in higher quality)
  const downloadFormats: AudioFormat[] = [];
  if (downloads > 0) {
    if (faker.number.int(10) > 5) downloadFormats.push(AudioFormat.ORIGINAL);
    if (faker.number.int(10) > 3) downloadFormats.push(AudioFormat.WAV);
    if (faker.number.int(10) > 6) downloadFormats.push(AudioFormat.MP3);
    if (faker.number.int(10) > 4) downloadFormats.push(AudioFormat.FLAC);
  }

  // Generate consistent dates
  const { firstPlayedAt, lastPlayedAt } = generatePlayDates(plays, seed * 61);

  try {
    await prisma.userStemActivity.upsert({
      where: {
        userId_stemId: {
          userId,
          stemId,
        },
      },
      create: {
        userId,
        stemId,
        firstPlayedAt,
        lastPlayedAt,
        playCount: plays,
        streamCount,
        syncedPlayCount,
        totalPlayTime,
        downloadCount: downloads,
        downloadFormats,
      },
      update: {
        lastPlayedAt,
        playCount: plays,
        streamCount,
        syncedPlayCount,
        totalPlayTime,
        downloadCount: downloads,
        downloadFormats,
      },
    });
  } catch (error) {
    console.error(
      `Error updating activity for stem ${stemName}, user ${userId}:`,
      error
    );
  }
}
