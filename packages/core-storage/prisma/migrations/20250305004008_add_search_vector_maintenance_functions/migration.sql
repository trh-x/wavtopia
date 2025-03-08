-- Add maintenance functions for Track search vectors

-- TODO: Consider refactoring to reduce code duplication
-- The vector calculation logic is currently duplicated in:
-- 1. tracks_search_vector_update() trigger function
-- 2. update_all_tracks_search_vector() batch function
-- 3. update_track_search_vector() single-record function
-- Could be extracted into a common function if this needs to be updated in future

-- Function to update search vectors for all tracks
CREATE OR REPLACE FUNCTION update_all_tracks_search_vector() RETURNS void AS $$
BEGIN
  -- Efficient batch update that processes all records in a single UPDATE
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

-- Function to update search vector for a specific track
CREATE OR REPLACE FUNCTION update_track_search_vector(track_id uuid) RETURNS void AS $$
BEGIN
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
    )
  WHERE id = track_id;
END
$$ LANGUAGE plpgsql;

-- Function to verify search vector integrity
CREATE OR REPLACE FUNCTION verify_tracks_search_vector() RETURNS TABLE(
  id uuid,
  title text,
  current_hash text,
  expected_hash text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.search_config_hash as current_hash,
    get_track_search_hash(
      t.title,
      t.primary_artist_name,
      t.description,
      t.lyrics,
      t.artist_names,
      t.genre_names,
      t.mood_names,
      t.tag_names
    ) as expected_hash
  FROM tracks t
  WHERE t.search_config_hash IS DISTINCT FROM get_track_search_hash(
    t.title,
    t.primary_artist_name,
    t.description,
    t.lyrics,
    t.artist_names,
    t.genre_names,
    t.mood_names,
    t.tag_names
  );
END
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_all_tracks_search_vector() IS 'Updates search vectors and hashes for all tracks in a single batch operation';
COMMENT ON FUNCTION update_track_search_vector(uuid) IS 'Updates search vector and hash for a specific track by ID';
COMMENT ON FUNCTION verify_tracks_search_vector() IS 'Returns tracks where the current search hash does not match the expected hash based on current field values';

-- Initialize search vectors and hashes for all existing tracks
SELECT update_all_tracks_search_vector();
