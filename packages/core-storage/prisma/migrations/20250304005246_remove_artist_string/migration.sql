-- This migration removes the artist string column after data has been migrated
-- to the primaryArtist relation and primaryArtistName denormalized field

-- First, make sure the migration function has been executed
-- Uncomment this line if it wasn't run in the previous migration
-- SELECT migrate_artist_string_to_relation();

-- Remove the index that references the artist column
DROP INDEX IF EXISTS "tracks_status_user_id_artist_created_at_id_idx";

-- Remove the artist column
ALTER TABLE "tracks" DROP COLUMN "artist"; 