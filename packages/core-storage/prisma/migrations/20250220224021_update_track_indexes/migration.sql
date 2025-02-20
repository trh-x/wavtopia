-- DropIndex
DROP INDEX "tracks_artist_id_idx";

-- DropIndex
DROP INDEX "tracks_created_at_id_idx";

-- DropIndex
DROP INDEX "tracks_duration_id_idx";

-- DropIndex
DROP INDEX "tracks_status_created_at_idx";

-- DropIndex
DROP INDEX "tracks_title_id_idx";

-- CreateIndex
CREATE INDEX "tracks_status_created_at_id_idx" ON "tracks"("status", "created_at", "id");

-- CreateIndex
CREATE INDEX "tracks_status_title_id_idx" ON "tracks"("status", "title", "id");

-- CreateIndex
CREATE INDEX "tracks_status_artist_id_idx" ON "tracks"("status", "artist", "id");

-- CreateIndex
CREATE INDEX "tracks_status_duration_id_idx" ON "tracks"("status", "duration", "id");
