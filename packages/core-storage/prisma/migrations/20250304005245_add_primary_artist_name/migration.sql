-- Add primary_artist_name column to tracks table
ALTER TABLE "tracks" ADD COLUMN "primary_artist_name" TEXT;

-- Create index for efficient filtering and sorting by primary artist name
CREATE INDEX idx_tracks_primary_artist_name ON tracks (primary_artist_name);

-- Create function to update primary_artist_name when primary_artist_id changes
CREATE OR REPLACE FUNCTION update_primary_artist_name() RETURNS TRIGGER AS $$
BEGIN
  -- If primary_artist_id is set, get the artist name
  IF NEW.primary_artist_id IS NOT NULL THEN
    NEW.primary_artist_name := (SELECT name FROM artists WHERE id = NEW.primary_artist_id);
    
    -- Ensure the primary artist name is in the artistNames array
    IF NEW.primary_artist_name IS NOT NULL AND 
       (NEW.artist_names IS NULL OR NOT (NEW.artist_names @> ARRAY[NEW.primary_artist_name])) THEN
      NEW.artist_names := array_append(COALESCE(NEW.artist_names, ARRAY[]::TEXT[]), NEW.primary_artist_name);
    END IF;
  ELSE
    NEW.primary_artist_name := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update primary_artist_name when a track is inserted or updated
CREATE TRIGGER track_primary_artist_name_update
BEFORE INSERT OR UPDATE OF primary_artist_id ON tracks
FOR EACH ROW
EXECUTE FUNCTION update_primary_artist_name();

-- Create function to update primary_artist_name when artist name changes
CREATE OR REPLACE FUNCTION update_primary_artist_name_on_artist_update() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name <> OLD.name THEN
    UPDATE tracks t
    SET primary_artist_name = NEW.name,
        artist_names = array_replace(artist_names, OLD.name, NEW.name)
    WHERE t.primary_artist_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update primary_artist_name when artist name changes
CREATE TRIGGER artist_name_update_primary_artist
AFTER UPDATE ON artists
FOR EACH ROW
WHEN (NEW.name <> OLD.name)
EXECUTE FUNCTION update_primary_artist_name_on_artist_update();

-- Populate primary_artist_name for existing data
UPDATE tracks t
SET primary_artist_name = a.name
FROM artists a
WHERE t.primary_artist_id = a.id;

-- Ensure primary artist names are in the artistNames array
UPDATE tracks
SET artist_names = array_append(artist_names, primary_artist_name)
WHERE primary_artist_name IS NOT NULL 
AND NOT (artist_names @> ARRAY[primary_artist_name]);

-- Migrate data from artist string field to primaryArtist relation
-- This assumes you want to create Artist records for existing artist strings
-- and set them as the primaryArtist

-- First, create a function to handle the migration
CREATE OR REPLACE FUNCTION migrate_artist_string_to_relation() RETURNS void AS $$
DECLARE
  artist_name text;
  artist_id uuid;
  track_record record;
BEGIN
  -- Loop through all tracks with non-null artist field
  FOR track_record IN 
    SELECT id, artist FROM tracks 
    WHERE artist IS NOT NULL AND artist <> ''
  LOOP
    -- Check if an artist with this name already exists
    SELECT id INTO artist_id FROM artists WHERE name = track_record.artist LIMIT 1;
    
    -- If not, create a new artist
    IF artist_id IS NULL THEN
      artist_id := gen_random_uuid();
      INSERT INTO artists (id, name, created_at, updated_at)
      VALUES (artist_id, track_record.artist, NOW(), NOW());
    END IF;
    
    -- Update the track with the artist relation
    UPDATE tracks t
    SET primary_artist_id = artist_id,
        primary_artist_name = track_record.artist,
        artist_names = CASE 
                         WHEN artist_names @> ARRAY[track_record.artist] THEN artist_names
                         ELSE array_append(COALESCE(artist_names, ARRAY[]::TEXT[]), track_record.artist)
                       END
    WHERE t.id = track_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the migration function
-- Uncomment this line when ready to migrate data
-- SELECT migrate_artist_string_to_relation(); 