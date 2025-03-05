-- PostgreSQL Full-Text Search Implementation for Track Model
-- This file contains SQL statements to set up full-text search for the Track model

-- 1. Add columns to the tracks table
ALTER TABLE tracks 
  ADD COLUMN search_vector tsvector,
  ADD COLUMN search_config_hash text;

-- 2. Create a function to generate a hash of searchable fields
CREATE OR REPLACE FUNCTION get_track_search_hash(
  title text,
  primary_artist_name text,
  description text,
  lyrics text,
  artist_names text[],
  genre_names text[],
  mood_names text[],
  tag_names text[]
) RETURNS text AS $$
  -- Use concat_ws() instead of multiple || operations (more efficient)
  -- Use md5() instead of sha256() (faster, and collision risk is acceptable for this use case)
  SELECT md5(concat_ws('|',
    COALESCE(title, ''),
    COALESCE(primary_artist_name, ''),
    COALESCE(description, ''),
    COALESCE(lyrics, ''),
    -- Use array_to_string() with a simpler separator
    COALESCE(array_to_string(artist_names, ','), ''),
    COALESCE(array_to_string(genre_names, ','), ''),
    COALESCE(array_to_string(mood_names, ','), ''),
    COALESCE(array_to_string(tag_names, ','), '')
  ));
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

-- 3. Create a function to update the search vector
CREATE OR REPLACE FUNCTION tracks_search_vector_update() RETURNS trigger AS $$
DECLARE
  new_hash text;
BEGIN
  -- Calculate hash of new values
  new_hash := get_track_search_hash(
    NEW.title,
    NEW.primary_artist_name,
    NEW.description,
    NEW.lyrics,
    NEW.artist_names,
    NEW.genre_names,
    NEW.mood_names,
    NEW.tag_names
  );

  -- Only update search vector if it's a new record or if the hash changed
  IF (TG_OP = 'INSERT') OR (NEW.search_config_hash IS DISTINCT FROM new_hash) THEN
    NEW.search_vector :=
      setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(NEW.primary_artist_name, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
      setweight(to_tsvector('english', COALESCE(NEW.lyrics, '')), 'C') ||
      setweight(to_tsvector('english', array_to_string(COALESCE(NEW.artist_names, ARRAY[]::text[]), ' ')), 'B') ||
      setweight(to_tsvector('english', array_to_string(COALESCE(NEW.genre_names, ARRAY[]::text[]), ' ')), 'B') ||
      setweight(to_tsvector('english', array_to_string(COALESCE(NEW.mood_names, ARRAY[]::text[]), ' ')), 'B') ||
      setweight(to_tsvector('english', array_to_string(COALESCE(NEW.tag_names, ARRAY[]::text[]), ' ')), 'C');
    
    NEW.search_config_hash := new_hash;
  END IF;
  
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- 4. Create a trigger to automatically update the search vector when a track is inserted or updated
CREATE TRIGGER tracks_search_vector_update
BEFORE INSERT OR UPDATE ON tracks
FOR EACH ROW
EXECUTE FUNCTION tracks_search_vector_update();

-- 5. Create a GIN index on the search vector for faster searching
CREATE INDEX tracks_search_idx ON tracks USING GIN (search_vector);

-- 6. Create an index on the search config hash
CREATE INDEX tracks_search_config_hash_idx ON tracks (search_config_hash);

-- 7. Example query to search tracks
-- This query searches for tracks matching 'electronic dance' and ranks results by relevance
/*
SELECT id, title, primary_artist_name, ts_rank(search_vector, query) AS rank
FROM tracks, to_tsquery('english', 'electronic & dance') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 10;
*/

-- 7. Example query with additional filters
/*
SELECT t.id, t.title, t.primary_artist_name, ts_rank(t.search_vector, query) AS rank
FROM tracks t
JOIN track_genres tg ON t.id = tg.track_id
JOIN genres g ON tg.genre_id = g.id, 
to_tsquery('english', 'electronic & dance') query
WHERE t.search_vector @@ query
AND g.name = 'House'
AND t.bpm BETWEEN 120 AND 130
ORDER BY rank DESC
LIMIT 10;
*/

-- 8. Example function to update search vectors for all existing tracks
/*
CREATE OR REPLACE FUNCTION update_all_tracks_search_vector() RETURNS void AS $$
BEGIN
  -- More efficient batch update that only processes each record once
  UPDATE tracks
  SET 
    search_vector = 
      setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(primary_artist_name, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
      setweight(to_tsvector('english', COALESCE(lyrics, '')), 'C') ||
      setweight(to_tsvector('english', array_to_string(COALESCE(artist_names, ARRAY[]::text[]), ' ')), 'B') ||
      setweight(to_tsvector('english', array_to_string(COALESCE(genre_names, ARRAY[]::text[]), ' ')), 'B') ||
      setweight(to_tsvector('english', array_to_string(COALESCE(mood_names, ARRAY[]::text[]), ' ')), 'B') ||
      setweight(to_tsvector('english', array_to_string(COALESCE(tag_names, ARRAY[]::text[]), ' ')), 'C'),
    search_config_hash = get_track_search_hash(
      title,
      primary_artist_name,
      description,
      lyrics,
      artist_names,
      genre_names,
      mood_names,
      tag_names
    );
END
$$ LANGUAGE plpgsql;
*/

-- Execute with: SELECT update_all_tracks_search_vector();

-- Notes:
-- 1. The weights (A, B, C, D) determine the priority of matches:
--    - A: Highest priority (title, primaryArtistName)
--    - B: Medium priority (description, genres, moods, artistNames)
--    - C: Lower priority (lyrics, tags, technical details)
--    - D: Lowest priority (not used in this example)
--
-- 2. This implementation uses English language for text search.
--    For multi-language support, consider using a language detection library
--    and storing language-specific vectors.
--
-- 3. Performance optimizations implemented:
--    - Uses a hash to detect changes instead of multiple array comparisons
--    - Hash function is marked as IMMUTABLE for better performance
--    - Trigger only updates search vector when the hash changes
--    - Batch update function processes all records in a single UPDATE
--    - GIN index for efficient full-text search queries 