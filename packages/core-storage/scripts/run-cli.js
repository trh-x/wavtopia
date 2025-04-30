#!/usr/bin/env node

const { spawnSync } = require("child_process");
const path = require("path");

// Get the script path from command line args
const scriptPath = process.argv[2];
if (!scriptPath) {
  console.error("Usage: run-cli.js <script-path>");
  process.exit(1);
}

// Convert paths to their production equivalents:
// src/cli/script.ts -> dist/cli/script.js
// prisma/seed.ts -> dist/prisma/seed.js
const getProductionPath = (devPath) => {
  return devPath
    .replace(/^src\//, "dist/")
    .replace(/^prisma\//, "dist/prisma/")
    .replace(/\.ts$/, ".js");
};

const isDev = process.env.NODE_ENV !== "production";
// Get all arguments after the script path
const scriptArgs = process.argv.slice(3);

const result = spawnSync(
  isDev ? "ts-node" : "node",
  [isDev ? scriptPath : getProductionPath(scriptPath), ...scriptArgs],
  {
    stdio: "inherit",
    cwd: path.resolve(__dirname, ".."),
  }
);

process.exit(result.status);
