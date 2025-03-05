-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- RenameIndex
ALTER INDEX "idx_tracks_artist_names" RENAME TO "tracks_artist_names_idx";

-- RenameIndex
ALTER INDEX "idx_tracks_genre_names" RENAME TO "tracks_genre_names_idx";

-- RenameIndex
ALTER INDEX "idx_tracks_mood_names" RENAME TO "tracks_mood_names_idx";

-- RenameIndex
ALTER INDEX "idx_tracks_primary_artist_name" RENAME TO "tracks_primary_artist_name_idx";

-- RenameIndex
ALTER INDEX "idx_tracks_tag_names" RENAME TO "tracks_tag_names_idx";

-- RenameIndex
ALTER INDEX "tracks_search_idx" RENAME TO "tracks_search_vector_idx";
