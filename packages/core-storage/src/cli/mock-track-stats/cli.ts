import { Options } from "./types";

export function printHelp() {
  console.log(`
Mock Track Stats - Generate mock engagement data for tracks and stems

Usage: pnpm db:mock-stats [options]

Options:
  --help              Show this help message
  --respect-existing  Skip tracks and stems that already have stats

By default (no options):
  - Generates new stats for all tracks and stems
  - Overrides any existing stats
  - ~40% of items get stats
  - Stats are deterministic based on track/stem names
  - Creates test users if they don't exist
  - Distributes activity across test users
  - Generates realistic play/download patterns:
    * Mix of streaming and synced plays
    * Various download formats
    * Appropriate timestamps
    * Activity spread across users
`);
  process.exit(0);
}

// Parse command line arguments
export function parseArgs(): Options {
  const args = process.argv.slice(2);
  return {
    respectExisting: args.includes("--respect-existing"),
  };
}
