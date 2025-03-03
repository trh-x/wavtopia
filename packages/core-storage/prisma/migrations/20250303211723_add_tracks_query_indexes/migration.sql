-- CreateIndex
CREATE INDEX "track_shares_user_id_idx" ON "track_shares"("user_id");

-- CreateIndex
CREATE INDEX "tracks_status_user_id_title_created_at_id_idx" ON "tracks"("status", "user_id", "title", "created_at", "id");

-- CreateIndex
CREATE INDEX "tracks_status_user_id_artist_created_at_id_idx" ON "tracks"("status", "user_id", "artist", "created_at", "id");

-- CreateIndex
CREATE INDEX "tracks_status_user_id_duration_created_at_id_idx" ON "tracks"("status", "user_id", "duration", "created_at", "id");

-- CreateIndex
CREATE INDEX "tracks_status_is_public_created_at_id_idx" ON "tracks"("status", "is_public", "created_at", "id");

-- CreateIndex
CREATE INDEX "tracks_is_public_status_created_at_idx" ON "tracks"("is_public", "status", "created_at");
