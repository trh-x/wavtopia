# Track Schema Extensions

This directory contains files related to extending the Track model with additional metadata fields and relationships.

## Files

- `schema.prisma`: The main Prisma schema file
- `track_extensions.prisma`: Contains normalized models related to Track (RecordLabel, Genre, Artist, etc.)
- `track_model_extensions.prisma`: Shows how to extend the Track model with new fields and relationships
- `full_text_search.sql`: SQL statements for implementing PostgreSQL full-text search

## Implementation Guide

### Step 1: Merge the Extensions into the Main Schema

To implement these extensions, you need to:

1. Copy the models from `track_extensions.prisma` into your main `schema.prisma` file
2. Add the fields and relationships from `track_model_extensions.prisma` to your Track model in `schema.prisma`

### Step 2: Create a Migration

After updating your schema, create a migration:

```bash
npx prisma migrate dev --name add_track_extensions
```

### Step 3: Implement Full-Text Search

The full-text search implementation uses PostgreSQL's built-in text search capabilities with several performance optimizations:

1. **Search Vector**: A `tsvector` column stores pre-processed searchable text
2. **Change Detection**: Uses MD5 hashing to efficiently detect changes in searchable content
3. **Weighted Search**: Different fields have different search weights:
   - Weight A: title, primaryArtistName (highest priority)
   - Weight B: description, genres, moods, artistNames (medium priority)
   - Weight C: lyrics, tags (lower priority)

Key features of the implementation:

- **Efficient Updates**: Only recalculates search vectors when searchable content changes
- **Optimized Storage**: Uses hash-based change detection to minimize processing
- **Parallel-Safe**: Functions are marked as PARALLEL SAFE for better performance
- **GIN Indexing**: Uses GIN indexes for fast full-text search queries

### Search and Filtering Considerations

Two main approaches are implemented for efficient searching and filtering:

1. **PostgreSQL Full-Text Search**:

   - Uses `tsvector` column with GIN index
   - Efficient change detection using MD5 hashing
   - Weighted search results based on field importance
   - Parallel-safe functions for better performance

2. **Denormalized Arrays for Filtering**:
   - Array columns with GIN indexes
   - Efficient filtering without joins
   - Works well with Prisma's query API

Performance optimizations include:

- Hash-based change detection to avoid unnecessary updates
- Efficient string concatenation using `concat_ws`
- Immutable and parallel-safe functions
- Batch processing for bulk updates
- Strategic use of GIN indexes

## Data Model Design Decisions

### Normalized vs. Denormalized Approach

The schema uses a hybrid approach:

- **Normalized entities**: RecordLabel, Genre, Artist, Album, etc. are stored in separate tables
- **Denormalized fields**: Frequently accessed metadata like bpm, key, releaseDate are stored directly in the Track table
- **Denormalized arrays**: For efficient filtering, we store arrays of names (genreNames, moodNames, artistNames, tagNames) directly in the Track table
- **Flexible storage**: Less structured or variable metadata can be stored in the `extendedMetadata` JSON field

### Search and Filtering Considerations

Two main approaches are implemented for efficient searching and filtering:

1. **PostgreSQL Full-Text Search**: Implemented via the `search_vector` column and related triggers

   - Pros: Integrated with the database, no additional infrastructure
   - Cons: Limited scalability compared to dedicated search solutions

2. **Denormalized Arrays for Filtering**: Implemented via array columns and triggers
   - Pros: Efficient filtering without expensive joins, works well with Prisma's query API
   - Cons: Requires keeping denormalized data in sync with triggers

The implementation includes:

- SQL triggers to maintain the denormalized arrays
- GIN indexes for efficient array operations
- Example TypeScript code for filtering using these arrays

## Usage Examples

### Querying Tracks with Related Data

```typescript
// Get a track with its genres and record label
const track = await prisma.track.findUnique({
  where: { id: trackId },
  include: {
    recordLabel: true,
    genres: {
      include: {
        genre: true,
      },
    },
  },
});

// Get all tracks by a specific artist (as composer)
const tracks = await prisma.track.findMany({
  where: {
    credits: {
      some: {
        artist: {
          name: "Artist Name",
        },
        creditType: "COMPOSER",
      },
    },
  },
});
```

### Filtering with Denormalized Arrays

```typescript
// Filter tracks by genre and BPM range (efficient, no joins needed)
const tracks = await prisma.track.findMany({
  where: {
    genreNames: { hasSome: ["House", "Techno"] },
    bpm: { gte: 120, lte: 130 },
  },
  orderBy: { createdAt: "desc" },
  take: 20,
});

// Filter tracks by multiple criteria using denormalized arrays
const tracks = await prisma.track.findMany({
  where: {
    genreNames: { hasSome: ["House"] },
    moodNames: { hasSome: ["Energetic"] },
    artistNames: { hasSome: ["DJ Name"] },
    isExplicit: false,
  },
  orderBy: { createdAt: "desc" },
  take: 20,
});
```

### Using Full-Text Search

```typescript
// Basic full-text search with ranking
const searchResults = await prisma.$queryRaw`
  SELECT 
    id, 
    title, 
    primary_artist_name,
    ts_rank(search_vector, websearch_to_tsquery('english', ${searchTerm})) as rank
  FROM tracks
  WHERE search_vector @@ websearch_to_tsquery('english', ${searchTerm})
  ORDER BY rank DESC
  LIMIT 10
`;

// Advanced search combining full-text search with filters
const searchResults = await prisma.$queryRaw`
  SELECT 
    id, 
    title, 
    primary_artist_name,
    ts_rank(search_vector, websearch_to_tsquery('english', ${searchTerm})) as rank
  FROM tracks
  WHERE 
    search_vector @@ websearch_to_tsquery('english', ${searchTerm})
    AND genre_names && ${genres}::text[]
    AND mood_names && ${moods}::text[]
    AND bpm BETWEEN ${minBpm} AND ${maxBpm}
  ORDER BY 
    rank DESC,
    created_at DESC
  LIMIT ${limit}
  OFFSET ${offset}
`;

// Example with plainto_tsquery for exact phrase matching
const searchResults = await prisma.$queryRaw`
  SELECT 
    id, 
    title, 
    primary_artist_name,
    ts_rank(search_vector, plainto_tsquery('english', ${exactPhrase})) as rank
  FROM tracks
  WHERE search_vector @@ plainto_tsquery('english', ${exactPhrase})
  ORDER BY rank DESC
  LIMIT 10
`;
```

### Performance Considerations

1. **Search Vector Updates**:

   - Updates only occur when searchable content changes
   - Change detection uses fast MD5 hashing
   - Batch updates available for bulk processing

2. **Query Optimization**:

   - GIN indexes for both full-text search and array operations
   - Weighted search results for better relevance
   - Efficient combination of full-text search with other filters

3. **Memory and CPU Usage**:
   - Efficient string concatenation
   - Parallel-safe functions
   - Optimized change detection
   - Minimal redundant processing
