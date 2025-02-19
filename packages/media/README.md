# Media Service

The Media Service handles all audio file processing, conversion, and cleanup operations for Wavtopia. It's responsible for:

- Converting module files (MOD, XM, IT) to WAV/FLAC/MP3 formats
- Managing audio file storage and cleanup
- Processing individual track components
- Handling audio file conversion queues

## Architecture

The service uses BullMQ for reliable job queue processing with the following queues:

- `track-conversion`: Converts module files to MP3/FLAC
- `audio-file-conversion`: Handles WAV/FLAC conversion requests
- `file-cleanup`: Manages automatic cleanup of unused audio files

## API Endpoints

### Track Conversion

- `POST /api/media/convert-module`
  - Converts a module file to MP3/FLAC format
  - Body: `{ trackId: string }`

### Audio File Conversion

- `POST /api/media/convert-audio`
  - Converts track or component to WAV/FLAC
  - Body: `{ trackId: string, type: "full" | "component", componentId?: string, format: "wav" | "flac" }`

### Status Endpoints

- `GET /api/media/status/:jobId`
  - Get conversion job status
- `GET /api/media/audio-conversion-status/:trackId`
  - Get track audio conversion status
- `GET /api/media/component/:componentId/audio-conversion-status`
  - Get component audio conversion status

### File Cleanup

- `POST /api/media/trigger-cleanup`
  - Trigger manual cleanup of old audio files
  - Body (optional):
    ```typescript
    {
      timeframe?: {
        value: number;
        unit: "days" | "hours" | "minutes" | "seconds";
      }
    }
    ```
  - Default: 7 days if not specified

## Maintenance Scripts

### File Cleanup

The service automatically cleans up WAV and FLAC files that haven't been accessed in over a week. This helps manage storage space and remove unnecessary files. The cleanup runs automatically at midnight daily, but can also be triggered manually.

To manually trigger the cleanup:

```bash
./packages/media/scripts/trigger-cleanup.sh [OPTIONS]
```

Options:

- `-h, --host`: Host address (default: localhost)
- `-p, --port`: Port number (default: 3000)
- `-t, --time`: Time value for cleanup threshold
- `-u, --unit`: Time unit (days|hours|minutes|seconds) (default: days)
- `--help`: Show help message

Examples:

```bash
# Using default settings (7 days threshold)
./packages/media/scripts/trigger-cleanup.sh

# Using custom host
./packages/media/scripts/trigger-cleanup.sh -h api.example.com

# Using custom port
./packages/media/scripts/trigger-cleanup.sh -p 8080

# Clean files older than 3 days
./packages/media/scripts/trigger-cleanup.sh -t 3

# Clean files older than 12 hours
./packages/media/scripts/trigger-cleanup.sh -t 12 -u hours

# Clean files older than 30 minutes
./packages/media/scripts/trigger-cleanup.sh -t 30 -u minutes

# Clean files older than 90 seconds
./packages/media/scripts/trigger-cleanup.sh -t 90 -u seconds

# Combine options
./packages/media/scripts/trigger-cleanup.sh -h api.example.com -p 8080 -t 1.5 -u hours
```

## Development

### Prerequisites

- Node.js 18+
- Redis (for job queues)
- FFmpeg (for audio conversion)

Optional:

- `jq` - For pretty-printing JSON responses in maintenance scripts

### Environment Variables

```
REDIS_URL=redis://localhost:6379
STORAGE_PATH=/path/to/storage
```

### Running Locally

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start the service:
   ```bash
   pnpm dev
   ```

### Building

```bash
pnpm build
```

### Docker

The service can be run using Docker:

```bash
docker build -t wavtopia-media .
docker run -p 3000:3000 wavtopia-media
```
