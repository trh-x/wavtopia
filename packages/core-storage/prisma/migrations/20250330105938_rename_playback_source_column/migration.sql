-- Rename playbackSource to playback_source in both event tables
ALTER TABLE "track_events" RENAME COLUMN "playbackSource" TO "playback_source";
ALTER TABLE "stem_events" RENAME COLUMN "playbackSource" TO "playback_source";
