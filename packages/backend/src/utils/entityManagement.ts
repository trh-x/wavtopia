import { prisma } from "../lib/prisma";

/**
 * Find or create an entity by name, ensuring consistent name handling
 * @param entityType The type of entity (e.g., 'artist', 'genre', 'mood')
 * @param name The name to find or create
 * @returns The found or created entity
 */
export async function findOrCreateByName(
  entityType: "artist" | "genre" | "mood" | "tag",
  name: string
) {
  // Ensure name is trimmed
  const trimmedName = name.trim();

  // Type assertion to help TypeScript understand the dynamic access
  const model = prisma[entityType] as unknown as {
    findFirst: (args: {
      where: { name: string };
    }) => Promise<{ id: string; name: string } | null>;
    create: (args: {
      data: { name: string };
    }) => Promise<{ id: string; name: string }>;
  };

  // Find existing entity
  const existing = await model.findFirst({
    where: { name: trimmedName },
  });

  if (existing) {
    return existing;
  }

  // Create new entity if not found
  return await model.create({
    data: { name: trimmedName },
  });
}
