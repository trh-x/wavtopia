import { PrismaClient } from ".prisma/client";

const prisma = new PrismaClient();

/**
 * Example functions for filtering tracks using denormalized arrays
 */

interface TrackFilterOptions {
  searchTerm?: string;
  genres?: string[];
  moods?: string[];
  artists?: string[];
  tags?: string[];
  bpmMin?: number;
  bpmMax?: number;
  key?: string;
  isExplicit?: boolean;
  releaseDateStart?: Date;
  releaseDateEnd?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Filter tracks using Prisma's query API
 * This approach works well for simple filters
 */
export async function filterTracks(options: TrackFilterOptions) {
  const {
    genres,
    moods,
    artists,
    tags,
    bpmMin,
    bpmMax,
    key,
    isExplicit,
    releaseDateStart,
    releaseDateEnd,
    limit = 20,
    offset = 0,
  } = options;

  // Build the where clause
  const where: any = {
    status: "ACTIVE", // Only include active tracks
  };

  // Add filters for denormalized arrays
  if (genres && genres.length > 0) {
    where.genreNames = { hasSome: genres };
  }

  if (moods && moods.length > 0) {
    where.moodNames = { hasSome: moods };
  }

  if (artists && artists.length > 0) {
    where.artistNames = { hasSome: artists };
  }

  if (tags && tags.length > 0) {
    where.tagNames = { hasSome: tags };
  }

  // Add filters for scalar fields
  if (bpmMin !== undefined || bpmMax !== undefined) {
    where.bpm = {};
    if (bpmMin !== undefined) where.bpm.gte = bpmMin;
    if (bpmMax !== undefined) where.bpm.lte = bpmMax;
  }

  if (key) {
    where.key = key;
  }

  if (isExplicit !== undefined) {
    where.isExplicit = isExplicit;
  }

  if (releaseDateStart || releaseDateEnd) {
    where.releaseDate = {};
    if (releaseDateStart) where.releaseDate.gte = releaseDateStart;
    if (releaseDateEnd) where.releaseDate.lte = releaseDateEnd;
  }

  // Execute the query
  const tracks = await prisma.track.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  const total = await prisma.track.count({ where });

  return { tracks, total };
}

/**
 * Filter tracks using raw SQL for full-text search combined with array filtering
 * This approach is more efficient for complex filters and full-text search
 */
export async function searchTracks(options: TrackFilterOptions) {
  const {
    searchTerm,
    genres,
    moods,
    artists,
    tags,
    bpmMin,
    bpmMax,
    limit = 20,
    offset = 0,
  } = options;

  // Build the SQL query parts
  const conditions: string[] = ["status = 'ACTIVE'"];
  const params: any[] = [];
  let paramIndex = 1;

  // Add full-text search condition if searchTerm is provided
  if (searchTerm) {
    conditions.push(`search_vector @@ to_tsquery('english', $${paramIndex})`);
    params.push(searchTerm.split(" ").join(" & "));
    paramIndex++;
  }

  // Add array filters
  if (genres && genres.length > 0) {
    conditions.push(`genre_names && $${paramIndex}`);
    params.push(genres);
    paramIndex++;
  }

  if (moods && moods.length > 0) {
    conditions.push(`mood_names && $${paramIndex}`);
    params.push(moods);
    paramIndex++;
  }

  if (artists && artists.length > 0) {
    conditions.push(`artist_names && $${paramIndex}`);
    params.push(artists);
    paramIndex++;
  }

  if (tags && tags.length > 0) {
    conditions.push(`tag_names && $${paramIndex}`);
    params.push(tags);
    paramIndex++;
  }

  // Add numeric range filters
  if (bpmMin !== undefined) {
    conditions.push(`bpm >= $${paramIndex}`);
    params.push(bpmMin);
    paramIndex++;
  }

  if (bpmMax !== undefined) {
    conditions.push(`bpm <= $${paramIndex}`);
    params.push(bpmMax);
    paramIndex++;
  }

  // Build the WHERE clause
  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Build the ORDER BY clause
  let orderByClause = "ORDER BY created_at DESC";
  if (searchTerm) {
    orderByClause = `ORDER BY ts_rank(search_vector, to_tsquery('english', $1)) DESC, created_at DESC`;
  }

  // Build the complete query
  const query = `
    SELECT 
      id, title, artist, duration, cover_art, is_public, 
      user_id, created_at, updated_at, bpm, key, 
      genre_names, mood_names, artist_names, tag_names
    FROM tracks
    ${whereClause}
    ${orderByClause}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  // Add limit and offset params
  params.push(limit, offset);

  // Execute the query
  const tracks = await prisma.$queryRawUnsafe(query, ...params);

  // Count total results
  const countQuery = `
    SELECT COUNT(*) as total
    FROM tracks
    ${whereClause}
  `;

  const [{ total }] = await prisma.$queryRawUnsafe<Array<{ total: number }>>(
    countQuery,
    ...params.slice(0, params.length - 2)
  );

  return { tracks, total };
}

/**
 * Get available filter options (genres, moods, etc.)
 * This helps populate filter UI components
 */
export async function getFilterOptions() {
  const [genres, moods, tags] = await Promise.all([
    prisma.genre.findMany({ orderBy: { name: "asc" } }),
    prisma.mood.findMany({ orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Get the most common artists (limited to top 100)
  const topArtists = await prisma.$queryRaw<{ name: string; count: number }[]>`
    SELECT name, COUNT(*) as count
    FROM artists a
    JOIN track_credits tc ON a.id = tc.artist_id
    GROUP BY name
    ORDER BY count DESC
    LIMIT 100
  `;

  return {
    genres: genres.map((g) => g.name),
    moods: moods.map((m) => m.name),
    tags: tags.map((t) => t.name),
    artists: topArtists.map((a) => a.name),
  };
}

/**
 * Example usage
 */
async function example() {
  // Simple filtering with Prisma
  const technoTracks = await filterTracks({
    genres: ["Techno"],
    bpmMin: 120,
    bpmMax: 140,
    limit: 10,
  });

  console.log(`Found ${technoTracks.total} techno tracks`);

  // Full-text search with raw SQL
  const searchResults = await searchTracks({
    searchTerm: "electronic dance",
    genres: ["House"],
    limit: 10,
  });

  console.log(`Found ${searchResults.total} tracks matching search`);

  // Get filter options for UI
  const filterOptions = await getFilterOptions();
  console.log(`Available genres: ${filterOptions.genres.join(", ")}`);
}

// Uncomment to run the example
// example()
//   .catch(console.error)
//   .finally(() => prisma.$disconnect());
