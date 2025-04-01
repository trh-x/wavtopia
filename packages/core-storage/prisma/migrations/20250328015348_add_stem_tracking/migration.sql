-- AlterTable
ALTER TABLE "stems" ADD COLUMN     "last_played_at" TIMESTAMP(3),
ADD COLUMN     "total_downloads" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_plays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unique_listeners" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "stem_events" (
    "id" TEXT NOT NULL,
    "stem_id" TEXT NOT NULL,
    "user_id" TEXT,
    "event_type" "TrackEventType" NOT NULL,
    "format" "AudioFormat",
    "playbackSource" "PlaybackSource",
    "duration" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stem_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stem_activity" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "stem_id" TEXT NOT NULL,
    "first_played_at" TIMESTAMP(3) NOT NULL,
    "last_played_at" TIMESTAMP(3) NOT NULL,
    "play_count" INTEGER NOT NULL DEFAULT 0,
    "stream_count" INTEGER NOT NULL DEFAULT 0,
    "local_play_count" INTEGER NOT NULL DEFAULT 0,
    "total_play_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "download_formats" "AudioFormat"[] DEFAULT ARRAY[]::"AudioFormat"[],

    CONSTRAINT "user_stem_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_stem_stats" (
    "id" TEXT NOT NULL,
    "stem_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "play_count" INTEGER NOT NULL DEFAULT 0,
    "stream_count" INTEGER NOT NULL DEFAULT 0,
    "local_play_count" INTEGER NOT NULL DEFAULT 0,
    "unique_play_count" INTEGER NOT NULL DEFAULT 0,
    "total_play_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "wav_downloads" INTEGER NOT NULL DEFAULT 0,
    "mp3_downloads" INTEGER NOT NULL DEFAULT 0,
    "flac_downloads" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_stem_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_stem_stats" (
    "id" TEXT NOT NULL,
    "stem_id" TEXT NOT NULL,
    "yearMonth" TIMESTAMP(3) NOT NULL,
    "play_count" INTEGER NOT NULL DEFAULT 0,
    "stream_count" INTEGER NOT NULL DEFAULT 0,
    "local_play_count" INTEGER NOT NULL DEFAULT 0,
    "unique_play_count" INTEGER NOT NULL DEFAULT 0,
    "total_play_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "wav_downloads" INTEGER NOT NULL DEFAULT 0,
    "mp3_downloads" INTEGER NOT NULL DEFAULT 0,
    "flac_downloads" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "monthly_stem_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stem_events_stem_id_event_type_created_at_idx" ON "stem_events"("stem_id", "event_type", "created_at");

-- CreateIndex
CREATE INDEX "stem_events_created_at_idx" ON "stem_events"("created_at");

-- CreateIndex
CREATE INDEX "user_stem_activity_stem_id_idx" ON "user_stem_activity"("stem_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_stem_activity_user_id_stem_id_key" ON "user_stem_activity"("user_id", "stem_id");

-- CreateIndex
CREATE INDEX "daily_stem_stats_date_idx" ON "daily_stem_stats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_stem_stats_stem_id_date_key" ON "daily_stem_stats"("stem_id", "date");

-- CreateIndex
CREATE INDEX "monthly_stem_stats_yearMonth_idx" ON "monthly_stem_stats"("yearMonth");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_stem_stats_stem_id_yearMonth_key" ON "monthly_stem_stats"("stem_id", "yearMonth");

-- AddForeignKey
ALTER TABLE "stem_events" ADD CONSTRAINT "stem_events_stem_id_fkey" FOREIGN KEY ("stem_id") REFERENCES "stems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stem_events" ADD CONSTRAINT "stem_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stem_activity" ADD CONSTRAINT "user_stem_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stem_activity" ADD CONSTRAINT "user_stem_activity_stem_id_fkey" FOREIGN KEY ("stem_id") REFERENCES "stems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_stem_stats" ADD CONSTRAINT "daily_stem_stats_stem_id_fkey" FOREIGN KEY ("stem_id") REFERENCES "stems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_stem_stats" ADD CONSTRAINT "monthly_stem_stats_stem_id_fkey" FOREIGN KEY ("stem_id") REFERENCES "stems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
