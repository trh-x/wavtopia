import { PrismaClient } from ".prisma/client";
import { faker } from "@faker-js/faker";
import { Options } from "./types";
import { ensureTestUsers, getTestUsers } from "./test-users";
import {
  hasExistingStats,
  shouldHaveStats,
  getEngagementLevel,
  getTrackUsers,
  getStringSeed,
} from "./utils";
import {
  generateUserTrackActivity,
  generateUserStemActivity,
} from "./activity-generator";
export { parseArgs, printHelp } from "./cli";

const prisma = new PrismaClient();

export async function generateEventData(options: Options) {
  try {
    await ensureTestUsers();

    // Get all tracks with their stems and existing activity
    const tracks = await prisma.track.findMany({
      select: {
        id: true,
        title: true,
        totalPlays: true,
        totalDownloads: true,
        stems: {
          select: {
            id: true,
            name: true,
            totalPlays: true,
            totalDownloads: true,
          },
        },
        userActivities: {
          select: {
            userId: true,
          },
        },
      },
    });

    console.log(`Found ${tracks.length} tracks. Generating event data...`);
    if (options.respectExisting) {
      console.log(
        "Mode: Respecting existing stats (skipping items with stats)"
      );
    } else {
      console.log("Mode: Default (overriding any existing stats)");
    }

    // Get all test users
    const users = await getTestUsers();

    // Update each track and its stems with generated engagement data
    for (const track of tracks) {
      // Skip if track has stats and we're respecting existing
      if (
        options.respectExisting &&
        hasExistingStats(track.totalPlays, track.totalDownloads)
      ) {
        console.log(
          `Skipped "${track.title}": has existing stats (${track.totalPlays} plays, ${track.totalDownloads} downloads)`
        );
        continue;
      }

      const hasTrackStats = shouldHaveStats(track.title);
      const trackStats = hasTrackStats
        ? getEngagementLevel(track.title)
        : { plays: 0, downloads: 0 };

      // Update track stats
      await prisma.track.update({
        where: { id: track.id },
        data: {
          totalPlays: trackStats.plays,
          totalDownloads: trackStats.downloads,
          lastPlayedAt:
            trackStats.plays > 0
              ? faker.date.recent({
                  days:
                    trackStats.plays > 50 ? 7 : trackStats.plays > 10 ? 30 : 90,
                })
              : null,
        },
      });

      if (hasTrackStats) {
        console.log(
          `Updated "${track.title}": ${trackStats.plays} plays, ${trackStats.downloads} downloads`
        );

        // Generate user activity for this track
        const trackUsers = getTrackUsers(track.title);
        console.log(`  Generating activity for ${trackUsers.length} users`);

        for (const testUser of trackUsers) {
          const user = users.find((u) => u.email === testUser.email);
          if (!user) continue;

          // Distribute plays/downloads across users
          const userSeed = getStringSeed(track.title + user.id);
          faker.seed(userSeed);

          const userPlays = faker.number.int({
            min: 1,
            max: Math.max(
              1,
              Math.floor((trackStats.plays / trackUsers.length) * 1.5)
            ),
          });

          const userDownloads = faker.number.int({
            min: 0,
            max: Math.max(
              0,
              Math.floor((trackStats.downloads / trackUsers.length) * 1.5)
            ),
          });

          await generateUserTrackActivity(
            user.id,
            track.id,
            track.title,
            userPlays,
            userDownloads
          );

          console.log(
            `    ${testUser.username}: ${userPlays} plays, ${userDownloads} downloads`
          );
        }
      } else {
        console.log(`Skipped "${track.title}": no stats`);
      }

      // Handle stems independently from track stats
      let stemsWithStats = 0;
      for (const stem of track.stems) {
        // Skip if stem has stats and we're respecting existing
        if (
          options.respectExisting &&
          hasExistingStats(stem.totalPlays, stem.totalDownloads)
        ) {
          console.log(
            `  Skipped stem "${stem.name}": has existing stats (${stem.totalPlays} plays, ${stem.totalDownloads} downloads)`
          );
          continue;
        }

        // Each stem has its own chance of having stats
        const hasStemStats = shouldHaveStats(stem.name);
        if (!hasStemStats) {
          continue;
        }

        const { plays: stemPlays, downloads: stemDownloads } =
          getEngagementLevel(stem.name);

        if (stemPlays > 0 || stemDownloads > 0) {
          await prisma.stem.update({
            where: { id: stem.id },
            data: {
              totalPlays: stemPlays,
              totalDownloads: stemDownloads,
              lastPlayedAt:
                stemPlays > 0
                  ? faker.date.recent({
                      days: stemPlays > 25 ? 7 : stemPlays > 5 ? 30 : 90,
                    })
                  : null,
            },
          });

          stemsWithStats++;
          console.log(
            `  Updated stem "${stem.name}": ${stemPlays} plays, ${stemDownloads} downloads`
          );

          // Generate user activity for this stem
          const stemUsers = getTrackUsers(stem.name); // Reuse same logic as tracks
          console.log(`    Generating activity for ${stemUsers.length} users`);

          for (const testUser of stemUsers) {
            const user = users.find((u) => u.email === testUser.email);
            if (!user) continue;

            // Distribute plays/downloads across users
            const userSeed = getStringSeed(stem.name + user.id);
            faker.seed(userSeed);

            const userPlays = faker.number.int({
              min: 1,
              max: Math.max(
                1,
                Math.floor((stemPlays / stemUsers.length) * 1.5)
              ),
            });

            const userDownloads = faker.number.int({
              min: 0,
              max: Math.max(
                0,
                Math.floor((stemDownloads / stemUsers.length) * 1.5)
              ),
            });

            await generateUserStemActivity(
              user.id,
              stem.id,
              stem.name,
              userPlays,
              userDownloads
            );

            console.log(
              `      ${testUser.username}: ${userPlays} plays, ${userDownloads} downloads`
            );
          }
        }
      }

      if (stemsWithStats > 0) {
        console.log(
          `  ${stemsWithStats}/${track.stems.length} stems have stats`
        );
      }
    }

    console.log("Done generating event data!");
  } catch (error) {
    console.error("Error generating event data:", error);
  } finally {
    await prisma.$disconnect();
  }
}
