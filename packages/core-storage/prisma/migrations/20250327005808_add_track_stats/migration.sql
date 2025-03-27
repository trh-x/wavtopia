-- CreateEnum
CREATE TYPE "TrackEventType" AS ENUM ('PLAY', 'DOWNLOAD');

-- CreateEnum
CREATE TYPE "PlaybackSource" AS ENUM ('STREAM', 'LOCAL');

-- CreateEnum
CREATE TYPE "AudioFormat" AS ENUM ('ORIGINAL', 'WAV', 'MP3', 'FLAC');

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "last_played_at" TIMESTAMP(3),
ADD COLUMN     "total_downloads" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_plays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unique_listeners" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "track_events" (
    "id" TEXT NOT NULL,
    "track_id" TEXT NOT NULL,
    "user_id" TEXT,
    "event_type" "TrackEventType" NOT NULL,
    "format" "AudioFormat",
    "playbackSource" "PlaybackSource",
    "duration" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "track_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_track_activity" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "track_id" TEXT NOT NULL,
    "first_played_at" TIMESTAMP(3) NOT NULL,
    "last_played_at" TIMESTAMP(3) NOT NULL,
    "play_count" INTEGER NOT NULL DEFAULT 0,
    "stream_count" INTEGER NOT NULL DEFAULT 0,
    "local_play_count" INTEGER NOT NULL DEFAULT 0,
    "total_play_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "download_formats" "AudioFormat"[] DEFAULT ARRAY[]::"AudioFormat"[],

    CONSTRAINT "user_track_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_track_stats" (
    "id" TEXT NOT NULL,
    "track_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "play_count" INTEGER NOT NULL DEFAULT 0,
    "stream_count" INTEGER NOT NULL DEFAULT 0,
    "local_play_count" INTEGER NOT NULL DEFAULT 0,
    "unique_play_count" INTEGER NOT NULL DEFAULT 0,
    "total_play_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "original_downloads" INTEGER NOT NULL DEFAULT 0,
    "wav_downloads" INTEGER NOT NULL DEFAULT 0,
    "mp3_downloads" INTEGER NOT NULL DEFAULT 0,
    "flac_downloads" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_track_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_track_stats" (
    "id" TEXT NOT NULL,
    "track_id" TEXT NOT NULL,
    "yearMonth" TIMESTAMP(3) NOT NULL,
    "play_count" INTEGER NOT NULL DEFAULT 0,
    "stream_count" INTEGER NOT NULL DEFAULT 0,
    "local_play_count" INTEGER NOT NULL DEFAULT 0,
    "unique_play_count" INTEGER NOT NULL DEFAULT 0,
    "total_play_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "original_downloads" INTEGER NOT NULL DEFAULT 0,
    "wav_downloads" INTEGER NOT NULL DEFAULT 0,
    "mp3_downloads" INTEGER NOT NULL DEFAULT 0,
    "flac_downloads" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "monthly_track_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "track_events_track_id_event_type_created_at_idx" ON "track_events"("track_id", "event_type", "created_at");

-- CreateIndex
CREATE INDEX "track_events_created_at_idx" ON "track_events"("created_at");

-- CreateIndex
CREATE INDEX "user_track_activity_track_id_idx" ON "user_track_activity"("track_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_track_activity_user_id_track_id_key" ON "user_track_activity"("user_id", "track_id");

-- CreateIndex
CREATE INDEX "daily_track_stats_date_idx" ON "daily_track_stats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_track_stats_track_id_date_key" ON "daily_track_stats"("track_id", "date");

-- CreateIndex
CREATE INDEX "monthly_track_stats_yearMonth_idx" ON "monthly_track_stats"("yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_track_stats_track_id_yearMonth_key" ON "monthly_track_stats"("track_id", "yearMonth");

-- AddForeignKey
ALTER TABLE "track_events" ADD CONSTRAINT "track_events_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_events" ADD CONSTRAINT "track_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_track_activity" ADD CONSTRAINT "user_track_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_track_activity" ADD CONSTRAINT "user_track_activity_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_track_stats" ADD CONSTRAINT "daily_track_stats_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_track_stats" ADD CONSTRAINT "monthly_track_stats_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
