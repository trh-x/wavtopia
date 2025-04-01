/*
  Warnings:

  - The values [LOCAL] on the enum `PlaybackSource` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PlaybackSource_new" AS ENUM ('STREAM', 'SYNCED');
ALTER TABLE "track_events" ALTER COLUMN "playbackSource" TYPE "PlaybackSource_new" USING ("playbackSource"::text::"PlaybackSource_new");
ALTER TABLE "stem_events" ALTER COLUMN "playbackSource" TYPE "PlaybackSource_new" USING ("playbackSource"::text::"PlaybackSource_new");
ALTER TYPE "PlaybackSource" RENAME TO "PlaybackSource_old";
ALTER TYPE "PlaybackSource_new" RENAME TO "PlaybackSource";
DROP TYPE "PlaybackSource_old";
COMMIT;
