import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { deleteFile } from "./storage";

/**
 * Delete all files associated with a track
 */
async function deleteTrackFiles(track: {
  originalUrl: string;
  fullTrackWavUrl?: string | null;
  fullTrackMp3Url?: string | null;
  coverArt?: string | null;
  components: { wavUrl: string; mp3Url: string }[];
}) {
  await deleteFile(track.originalUrl);

  if (track.fullTrackWavUrl) {
    await deleteFile(track.fullTrackWavUrl);
  }

  if (track.fullTrackMp3Url) {
    await deleteFile(track.fullTrackMp3Url);
  }

  if (track.coverArt) {
    await deleteFile(track.coverArt);
  }

  for (const component of track.components) {
    await deleteFile(component.wavUrl);
    await deleteFile(component.mp3Url);
  }
}

/**
 * Delete a single track and all its associated files
 */
export async function deleteTrack(trackId: string, userId: string) {
  const track = await prisma.track.findUnique({
    where: {
      id: trackId,
      userId, // Only delete user's own track
    },
    include: { components: true },
  });

  if (!track) {
    throw new AppError(404, "Track not found");
  }

  await prisma.$transaction(async (tx) => {
    // Delete all associated files
    await deleteTrackFiles(track);

    // Delete components first
    await tx.component.deleteMany({
      where: { trackId: track.id },
    });

    // Then delete the track
    await tx.track.delete({
      where: { id: trackId },
    });
  });
}

/**
 * Delete multiple tracks and all their associated files
 *
 * TODO: Add track deletions to the bullmq queue and remove this function
 */
export async function deleteMultipleTracks(trackIds: string[], userId: string) {
  const tracks = await prisma.track.findMany({
    where: {
      id: { in: trackIds },
      userId, // Only delete user's own tracks
    },
    include: { components: true },
  });

  if (tracks.length !== trackIds.length) {
    throw new AppError(404, "One or more tracks not found");
  }

  await prisma.$transaction(async (tx) => {
    // Delete all associated files for each track
    await Promise.all(tracks.map(deleteTrackFiles));

    // Delete all components for these tracks
    await tx.component.deleteMany({
      where: { trackId: { in: trackIds } },
    });

    // Then delete all tracks
    await tx.track.deleteMany({
      where: { id: { in: trackIds } },
    });
  });
}
