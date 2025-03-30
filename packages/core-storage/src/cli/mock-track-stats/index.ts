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
      try {
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
                      trackStats.plays > 50
                        ? 7
                        : trackStats.plays > 10
                        ? 30
                        : 90,
                  })
                : null,
          },
        });

        if (hasTrackStats) {
          console.log(
            `Updated "${track.title}": ${trackStats.plays} plays, ${trackStats.downloads} downloads`
          );

          // Generate user activity for this track
          const totalEngagement = trackStats.plays + trackStats.downloads;
          const trackUsers = getTrackUsers(track.title, totalEngagement);
          console.log(`  Generating activity for ${trackUsers.length} users`);

          for (let i = 0; i < trackUsers.length; i++) {
            const testUser = trackUsers[i];
            const user = users.find((u) => u.email === testUser.email);
            if (!user) continue;

            await generateUserTrackActivity(
              user.id,
              track.id,
              track.title,
              i,
              trackStats.plays,
              trackStats.downloads,
              trackUsers.length
            );
          }
        } else {
          console.log(`Skipped "${track.title}": no stats`);
        }

        // Handle stems independently from track stats
        let stemsWithStats = 0;
        for (const stem of track.stems) {
          try {
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

            const hasStemStats = shouldHaveStats(stem.name);
            if (!hasStemStats) continue;

            const stemStats = getEngagementLevel(stem.name);

            await prisma.stem.update({
              where: { id: stem.id },
              data: {
                totalPlays: stemStats.plays,
                totalDownloads: stemStats.downloads,
                lastPlayedAt:
                  stemStats.plays > 0
                    ? faker.date.recent({
                        days:
                          stemStats.plays > 25
                            ? 7
                            : stemStats.plays > 5
                            ? 30
                            : 90,
                      })
                    : null,
              },
            });

            stemsWithStats++;
            console.log(
              `  Updated stem "${stem.name}": ${stemStats.plays} plays, ${stemStats.downloads} downloads`
            );

            // Generate user activity for this stem
            const totalEngagement = stemStats.plays + stemStats.downloads;
            const stemUsers = getTrackUsers(stem.name, totalEngagement);
            console.log(
              `    Generating activity for ${stemUsers.length} users`
            );

            for (let i = 0; i < stemUsers.length; i++) {
              const testUser = stemUsers[i];
              const user = users.find((u) => u.email === testUser.email);
              if (!user) continue;

              await generateUserStemActivity(
                user.id,
                stem.id,
                stem.name,
                i,
                stemStats.plays,
                stemStats.downloads,
                stemUsers.length
              );
            }
          } catch (error) {
            console.error(`Error processing stem ${stem.name}:`, error);
          }
        }

        if (stemsWithStats > 0) {
          console.log(
            `  ${stemsWithStats}/${track.stems.length} stems have stats`
          );
        }
      } catch (error) {
        console.error(`Error processing track ${track.title}:`, error);
      }
    }

    console.log("Done generating event data!");
  } catch (error) {
    console.error("Error generating event data:", error);
  } finally {
    await prisma.$disconnect();
  }
}
