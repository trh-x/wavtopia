-- This migration makes the primary_artist_id field required after data migration

-- First, make sure all tracks have a primary artist
-- This will identify any tracks without a primary artist
-- SELECT id, title FROM tracks WHERE primary_artist_id IS NULL;

-- If there are any tracks without a primary artist, you might want to:
-- 1. Create a default "Unknown Artist" record
-- 2. Assign all tracks without a primary artist to this record

-- Create an "Unknown Artist" if it doesn't exist
DO $$
DECLARE
  unknown_artist_id uuid;
BEGIN
  -- Check if "Unknown Artist" already exists
  SELECT id INTO unknown_artist_id FROM artists WHERE name = 'Unknown Artist' LIMIT 1;
  
  -- If not, create it
  IF unknown_artist_id IS NULL THEN
    unknown_artist_id := gen_random_uuid();
    INSERT INTO artists (id, name, created_at, updated_at)
    VALUES (unknown_artist_id, 'Unknown Artist', NOW(), NOW());
  END IF;
  
  -- Assign all tracks without a primary artist to "Unknown Artist"
  UPDATE tracks
  SET primary_artist_id = unknown_artist_id,
      primary_artist_name = 'Unknown Artist',
      artist_names = CASE 
                       WHEN artist_names @> ARRAY['Unknown Artist'] THEN artist_names
                       ELSE array_append(COALESCE(artist_names, ARRAY[]::TEXT[]), 'Unknown Artist')
                     END
  WHERE primary_artist_id IS NULL;
END $$;

-- Now make the primary_artist_id field NOT NULL
ALTER TABLE "tracks" ALTER COLUMN "primary_artist_id" SET NOT NULL; 