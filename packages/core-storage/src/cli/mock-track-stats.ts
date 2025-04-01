// This file has been refactored into a modular structure.
// See the mock-track-stats/ directory for the implementation.
import {
  generateEventData,
  parseArgs,
  printHelp,
} from "./mock-track-stats/index";

// Check for help flag first
if (process.argv.slice(2).includes("--help")) {
  printHelp();
} else {
  const options = parseArgs();
  generateEventData(options);
}
