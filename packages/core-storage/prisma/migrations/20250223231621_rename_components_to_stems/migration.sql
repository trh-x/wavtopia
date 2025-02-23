-- Rename the table
ALTER TABLE "components" RENAME TO "stems";

-- Rename the primary key constraint
ALTER INDEX "components_pkey" RENAME TO "stems_pkey";

-- Rename the unique constraint
ALTER TABLE "stems" RENAME CONSTRAINT "components_track_id_index_key" TO "stems_track_id_index_key";

-- Rename the foreign key constraint
ALTER TABLE "stems" RENAME CONSTRAINT "components_track_id_fkey" TO "stems_track_id_fkey";

-- Rename the indexes
ALTER INDEX "components_wav_last_requested_at_idx" RENAME TO "stems_wav_last_requested_at_idx";
ALTER INDEX "components_flac_last_requested_at_idx" RENAME TO "stems_flac_last_requested_at_idx"; 