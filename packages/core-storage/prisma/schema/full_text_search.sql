-- PostgreSQL Full-Text Search Implementation for Track Model
-- This file contains SQL statements to set up full-text search for the Track model

-- 1. Add a tsvector column to the tracks table
ALTER TABLE tracks ADD COLUMN search_vector tsvector;

-- 2. Create a function to update the search vector
CREATE OR REPLACE FUNCTION tracks_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.artist, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.lyrics, '')), 'C');
  
  -- Add more fields as needed, for example:
  -- setweight(to_tsvector('english', (SELECT string_agg(g.name, ' ') FROM genres g JOIN track_genres tg ON g.id = tg.genre_id WHERE tg.track_id = NEW.id)), 'B') ||
  -- setweight(to_tsvector('english', COALESCE(NEW.version, '')), 'C') ||
  -- setweight(to_tsvector('english', COALESCE(NEW.remixed_by, '')), 'C');
  
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- 3. Create a trigger to automatically update the search vector when a track is inserted or updated
CREATE TRIGGER tracks_search_vector_update
BEFORE INSERT OR UPDATE ON tracks
FOR EACH ROW
EXECUTE FUNCTION tracks_search_vector_update();

-- 4. Create a GIN index on the search vector for faster searching
CREATE INDEX tracks_search_idx ON tracks USING GIN (search_vector);

-- 5. Example query to search tracks
-- This query searches for tracks matching 'electronic dance' and ranks results by relevance
/*
SELECT id, title, artist, ts_rank(search_vector, query) AS rank
FROM tracks, to_tsquery('english', 'electronic & dance') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 10;
*/

-- 6. Example query with additional filters
/*
SELECT t.id, t.title, t.artist, ts_rank(t.search_vector, query) AS rank
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

-- 7. Example function to update search vectors for all existing tracks
/*
CREATE OR REPLACE FUNCTION update_all_tracks_search_vector() RETURNS void AS $$
DECLARE
  track_record RECORD;
BEGIN
  FOR track_record IN SELECT * FROM tracks LOOP
    UPDATE tracks
    SET search_vector = 
      setweight(to_tsvector('english', COALESCE(track_record.title, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(track_record.artist, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(track_record.description, '')), 'B') ||
      setweight(to_tsvector('english', COALESCE(track_record.lyrics, '')), 'C')
    WHERE id = track_record.id;
  END LOOP;
END
$$ LANGUAGE plpgsql;

-- Execute with: SELECT update_all_tracks_search_vector();
*/

-- Notes:
-- 1. The weights (A, B, C, D) determine the priority of matches:
--    - A: Highest priority (title, artist)
--    - B: Medium priority (description, genres)
--    - C: Lower priority (lyrics, technical details)
--    - D: Lowest priority (not used in this example)
--
-- 2. This implementation uses English language for text search.
--    For multi-language support, consider using a language detection library
--    and storing language-specific vectors.
--
-- 3. For very large tables, consider using a materialized view or
--    a separate search table that is updated asynchronously. 