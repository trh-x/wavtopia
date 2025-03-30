import { PrismaClient } from ".prisma/client";
import { faker } from "@faker-js/faker";
import { AudioFormat } from "./types";
import { getStringSeed } from "./utils";

const prisma = new PrismaClient();

// Generate activity for a single user and track
export async function generateUserTrackActivity(
  userId: string,
  trackId: string,
  trackName: string,
  totalPlays: number,
  totalDownloads: number
) {
  if (totalPlays === 0 && totalDownloads === 0) return;

  const seed = getStringSeed(trackName + userId);
  faker.seed(seed);

  // Distribute plays between stream and synced
  const streamCount = faker.number.int({ min: 0, max: totalPlays });
  const syncedPlayCount = totalPlays - streamCount;

  // Calculate play times based on engagement
  const avgPlayTime = faker.number.float({ min: 60, max: 180 }); // 1-3 minutes
  const totalPlayTime = totalPlays * avgPlayTime;

  // Determine download formats
  const downloadFormats: AudioFormat[] = [];
  if (totalDownloads > 0) {
    if (faker.number.int(10) > 7) downloadFormats.push(AudioFormat.ORIGINAL);
    if (faker.number.int(10) > 4) downloadFormats.push(AudioFormat.WAV);
    if (faker.number.int(10) > 2) downloadFormats.push(AudioFormat.MP3);
    if (faker.number.int(10) > 8) downloadFormats.push(AudioFormat.FLAC);
  }

  // Calculate dates based on engagement level
  const now = new Date();
  const daysAgo = totalPlays > 50 ? 7 : totalPlays > 10 ? 30 : 90;
  const lastPlayedAt = faker.date.recent({ days: daysAgo });
  const firstPlayedAt = faker.date.past({
    years: 1,
    refDate: lastPlayedAt,
  });

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
      playCount: totalPlays,
      streamCount,
      syncedPlayCount,
      totalPlayTime,
      downloadCount: totalDownloads,
      downloadFormats,
    },
    update: {
      lastPlayedAt,
      playCount: totalPlays,
      streamCount,
      syncedPlayCount,
      totalPlayTime,
      downloadCount: totalDownloads,
      downloadFormats,
    },
  });
}

// Generate activity for a single user and stem
export async function generateUserStemActivity(
  userId: string,
  stemId: string,
  stemName: string,
  totalPlays: number,
  totalDownloads: number
) {
  if (totalPlays === 0 && totalDownloads === 0) return;

  const seed = getStringSeed(stemName + userId);
  faker.seed(seed);

  // Distribute plays between stream and synced
  const streamCount = faker.number.int({ min: 0, max: totalPlays });
  const syncedPlayCount = totalPlays - streamCount;

  // Calculate play times based on engagement
  const avgPlayTime = faker.number.float({ min: 30, max: 120 }); // 30s-2m for stems
  const totalPlayTime = totalPlays * avgPlayTime;

  // Determine download formats (stems tend to be downloaded in higher quality)
  const downloadFormats: AudioFormat[] = [];
  if (totalDownloads > 0) {
    if (faker.number.int(10) > 5) downloadFormats.push(AudioFormat.ORIGINAL);
    if (faker.number.int(10) > 3) downloadFormats.push(AudioFormat.WAV);
    if (faker.number.int(10) > 6) downloadFormats.push(AudioFormat.MP3);
    if (faker.number.int(10) > 4) downloadFormats.push(AudioFormat.FLAC);
  }

  // Calculate dates based on engagement level
  const now = new Date();
  const daysAgo = totalPlays > 25 ? 7 : totalPlays > 5 ? 30 : 90;
  const lastPlayedAt = faker.date.recent({ days: daysAgo });
  const firstPlayedAt = faker.date.past({
    years: 1,
    refDate: lastPlayedAt,
  });

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
      playCount: totalPlays,
      streamCount,
      syncedPlayCount,
      totalPlayTime,
      downloadCount: totalDownloads,
      downloadFormats,
    },
    update: {
      lastPlayedAt,
      playCount: totalPlays,
      streamCount,
      syncedPlayCount,
      totalPlayTime,
      downloadCount: totalDownloads,
      downloadFormats,
    },
  });
}
