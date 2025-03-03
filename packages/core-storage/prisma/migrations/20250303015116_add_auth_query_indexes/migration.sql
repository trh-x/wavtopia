-- CreateIndex
CREATE INDEX "track_shares_track_id_idx" ON "track_shares"("track_id");

-- CreateIndex
CREATE INDEX "tracks_id_status_idx" ON "tracks"("id", "status");
