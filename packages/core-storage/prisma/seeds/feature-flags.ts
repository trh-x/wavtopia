/// <reference types="node" />
import { PrismaClient } from ".prisma/client";

const prisma = new PrismaClient();

export async function seedFeatureFlags() {
  const flags = [
    {
      name: "EARLY_ACCESS_REQUIRED",
      description: "Requires users to have an invite code to register",
      isEnabled: true,
    },
    // Any other default feature flags would go here
  ];

  console.log("Seeding feature flags...");

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { name: flag.name },
      update: flag,
      create: flag,
    });
  }

  console.log("Feature flag seeding completed.");
}

// Run if executed directly
if (require.main === module) {
  seedFeatureFlags()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
