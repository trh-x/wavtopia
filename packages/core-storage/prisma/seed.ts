/// <reference types="node" />
import { PrismaClient } from ".prisma/client";
import { seedFeatureFlags } from "./seeds/feature-flags";
import { seedLicenses } from "./seeds/licenses";
import { seedSystemSettings } from "./seeds/system-settings";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding...");

  // Seed system settings first as other seeds might depend on them
  await seedSystemSettings();

  // Seed feature flags
  await seedFeatureFlags();

  // Seed licenses
  await seedLicenses();

  // Add other seed functions here as needed
  // await seedOtherData()

  console.log("Database seeding completed.");
}

main()
  .catch((e) => {
    console.error("Error during database seeding:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
