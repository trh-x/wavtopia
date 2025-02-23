-- Drop the indexes first (but not the primary key constraint)
DROP INDEX IF EXISTS "components_wav_last_requested_at_idx";
DROP INDEX IF EXISTS "components_flac_last_requested_at_idx";
DROP INDEX IF EXISTS "components_track_id_index_key";

-- Rename the table (this will preserve the primary key constraint)
ALTER TABLE "components" RENAME TO "stems";

-- Rename the primary key constraint
ALTER TABLE "stems" RENAME CONSTRAINT "components_pkey" TO "stems_pkey";

-- Rename the foreign key constraint
ALTER TABLE "stems" RENAME CONSTRAINT "components_track_id_fkey" TO "stems_track_id_fkey";

-- Recreate the indexes with new names
CREATE UNIQUE INDEX "stems_track_id_index_key" ON "stems"("track_id", "index");
CREATE INDEX "stems_wav_last_requested_at_idx" ON "stems"("wav_last_requested_at");
CREATE INDEX "stems_flac_last_requested_at_idx" ON "stems"("flac_last_requested_at"); 