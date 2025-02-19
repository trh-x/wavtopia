-- CreateIndex
CREATE INDEX "components_wav_last_requested_at_idx" ON "components"("wav_last_requested_at");

-- CreateIndex
CREATE INDEX "components_flac_last_requested_at_idx" ON "components"("flac_last_requested_at");

-- CreateIndex
CREATE INDEX "tracks_original_format_wav_last_requested_at_idx" ON "tracks"("original_format", "wav_last_requested_at");

-- CreateIndex
CREATE INDEX "tracks_original_format_flac_last_requested_at_idx" ON "tracks"("original_format", "flac_last_requested_at");
