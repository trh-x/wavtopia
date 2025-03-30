/*
  Warnings:

  - You are about to drop the column `local_play_count` on the `daily_stem_stats` table. All the data in the column will be lost.
  - You are about to drop the column `local_play_count` on the `daily_track_stats` table. All the data in the column will be lost.
  - You are about to drop the column `local_play_count` on the `monthly_stem_stats` table. All the data in the column will be lost.
  - You are about to drop the column `local_play_count` on the `monthly_track_stats` table. All the data in the column will be lost.
  - You are about to drop the column `local_play_count` on the `user_stem_activity` table. All the data in the column will be lost.
  - You are about to drop the column `local_play_count` on the `user_track_activity` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "daily_stem_stats" DROP COLUMN "local_play_count",
ADD COLUMN     "synced_play_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "daily_track_stats" DROP COLUMN "local_play_count",
ADD COLUMN     "synced_play_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "monthly_stem_stats" DROP COLUMN "local_play_count",
ADD COLUMN     "synced_play_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "monthly_track_stats" DROP COLUMN "local_play_count",
ADD COLUMN     "synced_play_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user_stem_activity" DROP COLUMN "local_play_count",
ADD COLUMN     "synced_play_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user_track_activity" DROP COLUMN "local_play_count",
ADD COLUMN     "synced_play_count" INTEGER NOT NULL DEFAULT 0;
