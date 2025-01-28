#!/bin/bash
set -e

# Get the absolute path to the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Update submodule if needed
cd "$REPO_ROOT"
git submodule update --remote packages/media/deps/milkytracker

# Get and output the commit hash
cd packages/media/deps/milkytracker
git rev-parse HEAD 