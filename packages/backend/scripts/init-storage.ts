import { initializeStorage } from "../src/services/storage";

async function main() {
  try {
    await initializeStorage();
    console.log("Storage initialized successfully");
    process.exit(0);
  } catch (error) {
    console.error("Failed to initialize storage:", error);
    process.exit(1);
  }
}

main();
