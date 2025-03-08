-- Denormalized Arrays for Efficient Filtering
-- This file contains SQL statements to implement denormalized arrays for many-to-many relationships

-- 1. Add array columns to the tracks table
ALTER TABLE tracks ADD COLUMN genre_names TEXT[] DEFAULT '{}';
ALTER TABLE tracks ADD COLUMN mood_names TEXT[] DEFAULT '{}';
ALTER TABLE tracks ADD COLUMN artist_names TEXT[] DEFAULT '{}';
ALTER TABLE tracks ADD COLUMN tag_names TEXT[] DEFAULT '{}';

-- 2. Create GIN indexes on the array columns for efficient filtering
CREATE INDEX idx_tracks_genre_names ON tracks USING GIN (genre_names);
CREATE INDEX idx_tracks_mood_names ON tracks USING GIN (mood_names);
CREATE INDEX idx_tracks_artist_names ON tracks USING GIN (artist_names);
CREATE INDEX idx_tracks_tag_names ON tracks USING GIN (tag_names);

-- 3. Create functions and triggers to keep the arrays in sync with the related tables

-- Genre Names
CREATE OR REPLACE FUNCTION update_track_genre_names() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tracks
    SET genre_names = array_append(genre_names, (SELECT name FROM genres WHERE id = NEW.genre_id))
    WHERE id = NEW.track_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tracks
    SET genre_names = array_remove(genre_names, (SELECT name FROM genres WHERE id = OLD.genre_id))
    WHERE id = OLD.track_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_genre_names_update
AFTER INSERT OR DELETE ON track_genres
FOR EACH ROW
EXECUTE FUNCTION update_track_genre_names();

-- Mood Names
CREATE OR REPLACE FUNCTION update_track_mood_names() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tracks
    SET mood_names = array_append(mood_names, (SELECT name FROM moods WHERE id = NEW.mood_id))
    WHERE id = NEW.track_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tracks
    SET mood_names = array_remove(mood_names, (SELECT name FROM moods WHERE id = OLD.mood_id))
    WHERE id = OLD.track_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_mood_names_update
AFTER INSERT OR DELETE ON track_moods
FOR EACH ROW
EXECUTE FUNCTION update_track_mood_names();

-- Artist Names (from TrackCredit)
CREATE OR REPLACE FUNCTION update_track_artist_names() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tracks
    SET artist_names = array_append(artist_names, (SELECT name FROM artists WHERE id = NEW.artist_id))
    WHERE id = NEW.track_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tracks
    SET artist_names = array_remove(artist_names, (SELECT name FROM artists WHERE id = OLD.artist_id))
    WHERE id = OLD.track_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_artist_names_update
AFTER INSERT OR DELETE ON track_credits
FOR EACH ROW
EXECUTE FUNCTION update_track_artist_names();

-- Tag Names
CREATE OR REPLACE FUNCTION update_track_tag_names() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tracks
    SET tag_names = array_append(tag_names, (SELECT name FROM tags WHERE id = NEW.tag_id))
    WHERE id = NEW.track_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tracks
    SET tag_names = array_remove(tag_names, (SELECT name FROM tags WHERE id = OLD.tag_id))
    WHERE id = OLD.track_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_tag_names_update
AFTER INSERT OR DELETE ON track_tags
FOR EACH ROW
EXECUTE FUNCTION update_track_tag_names();

-- 4. Handle updates to the name fields in the related tables

-- Genre Name Updates
CREATE OR REPLACE FUNCTION update_genre_name_in_tracks() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name <> OLD.name THEN
    UPDATE tracks
    SET genre_names = array_replace(genre_names, OLD.name, NEW.name)
    WHERE genre_names @> ARRAY[OLD.name];
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER genre_name_update
AFTER UPDATE ON genres
FOR EACH ROW
WHEN (NEW.name <> OLD.name)
EXECUTE FUNCTION update_genre_name_in_tracks();

-- Mood Name Updates
CREATE OR REPLACE FUNCTION update_mood_name_in_tracks() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name <> OLD.name THEN
    UPDATE tracks
    SET mood_names = array_replace(mood_names, OLD.name, NEW.name)
    WHERE mood_names @> ARRAY[OLD.name];
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mood_name_update
AFTER UPDATE ON moods
FOR EACH ROW
WHEN (NEW.name <> OLD.name)
EXECUTE FUNCTION update_mood_name_in_tracks();

-- Artist Name Updates
CREATE OR REPLACE FUNCTION update_artist_name_in_tracks() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name <> OLD.name THEN
    UPDATE tracks
    SET artist_names = array_replace(artist_names, OLD.name, NEW.name)
    WHERE artist_names @> ARRAY[OLD.name];
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER artist_name_update
AFTER UPDATE ON artists
FOR EACH ROW
WHEN (NEW.name <> OLD.name)
EXECUTE FUNCTION update_artist_name_in_tracks();

-- Tag Name Updates
CREATE OR REPLACE FUNCTION update_tag_name_in_tracks() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name <> OLD.name THEN
    UPDATE tracks
    SET tag_names = array_replace(tag_names, OLD.name, NEW.name)
    WHERE tag_names @> ARRAY[OLD.name];
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tag_name_update
AFTER UPDATE ON tags
FOR EACH ROW
WHEN (NEW.name <> OLD.name)
EXECUTE FUNCTION update_tag_name_in_tracks();

-- 5. Function to populate the arrays for existing data
CREATE OR REPLACE FUNCTION populate_track_array_fields() RETURNS void AS $$
BEGIN
  -- Populate genre_names
  UPDATE tracks t
  SET genre_names = ARRAY(
    SELECT g.name
    FROM genres g
    JOIN track_genres tg ON g.id = tg.genre_id
    WHERE tg.track_id = t.id
  );
  
  -- Populate mood_names
  UPDATE tracks t
  SET mood_names = ARRAY(
    SELECT m.name
    FROM moods m
    JOIN track_moods tm ON m.id = tm.mood_id
    WHERE tm.track_id = t.id
  );
  
  -- Populate artist_names
  UPDATE tracks t
  SET artist_names = ARRAY(
    SELECT a.name
    FROM artists a
    JOIN track_credits tc ON a.id = tc.artist_id
    WHERE tc.track_id = t.id
  );
  
  -- Populate tag_names
  UPDATE tracks t
  SET tag_names = ARRAY(
    SELECT tg.name
    FROM tags tg
    JOIN track_tags tt ON tg.id = tt.tag_id
    WHERE tt.track_id = t.id
  );
END;
$$ LANGUAGE plpgsql;

-- Execute with: SELECT populate_track_array_fields();

-- 6. Example queries for filtering using the denormalized arrays

/*
-- Find tracks with specific genres
SELECT * FROM tracks
WHERE genre_names && ARRAY['House', 'Techno']
ORDER BY created_at DESC
LIMIT 20;

-- Find tracks with specific moods and BPM range
SELECT * FROM tracks
WHERE mood_names && ARRAY['Energetic', 'Happy']
AND bpm BETWEEN 120 AND 130
ORDER BY created_at DESC
LIMIT 20;

-- Find tracks with specific artists and tags
SELECT * FROM tracks
WHERE artist_names && ARRAY['Artist Name']
AND tag_names && ARRAY['Summer', 'Dance']
ORDER BY created_at DESC
LIMIT 20;

-- Combine with full-text search
SELECT *, ts_rank(search_vector, to_tsquery('english', 'dance')) AS rank
FROM tracks
WHERE search_vector @@ to_tsquery('english', 'dance')
AND genre_names && ARRAY['House']
AND bpm > 120
ORDER BY rank DESC
LIMIT 20;
*/ 