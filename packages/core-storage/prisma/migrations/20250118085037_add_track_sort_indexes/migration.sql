-- CreateIndex
CREATE INDEX "tracks_title_id_idx" ON "tracks"("title", "id");

-- CreateIndex
CREATE INDEX "tracks_artist_id_idx" ON "tracks"("artist", "id");

-- CreateIndex
CREATE INDEX "tracks_duration_id_idx" ON "tracks"("duration", "id");
