# Wavtopia

<img src="wavtopia-icon.png" alt="Wavtopia Icon" width="128" height="128" />

A modern web platform for sharing and downloading multi-track music files. Wavtopia allows you to upload tracker music files (.xm, .it, .s3m, .mod formats) and automatically converts them into individual WAV stems and a full track WAV file.

## Features

- **Track Management**: Upload, manage, and share your music tracks
- **Audio Conversion**: Automatic conversion of .xm, .it, .s3m, and .mod files to WAV format
- **Stem Extraction**: Split tracks into individual instrument stems
- **Multi-format Downloads**:
  - Download the original tracker file (.xm, .it, .s3m, .mod)
  - Download the full track as WAV
  - Download individual instrument stems as WAV
- **Real-time Playback**: Play and preview tracks directly in the browser
- **Modern UI**: Responsive design that works on desktop and mobile
- **Secure Access**: User authentication and personal track management

## Tech Stack

- Frontend: React, TypeScript, Vite, TailwindCSS, Tone.js
- Backend: Node.js, Express, TypeScript, Prisma
- Database: PostgreSQL
- Storage: MinIO/S3
- Audio Processing: FFmpeg, libxmp

## Development

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- PostgreSQL >= 14
- FFmpeg
- libxmp
- MinIO (for local development) or S3-compatible storage
- milkycli utility (see below)
- schismtracker application (see below)

### `milkycli` Installation

The project requires the `milkycli` utility from MilkyTracker for converting XM files to WAV format. This utility is included as a git submodule from [this open pull request](https://github.com/milkytracker/MilkyTracker/pull/372).

When cloning the repository, make sure to initialize the submodules:

```bash
# If cloning for the first time:
git clone --recursive https://github.com/your-repo/wavtopia.git

# If you've already cloned the repository:
git submodule update --init --recursive

# Pulling dependency changes into this repo:
git submodule update --remote
git add packages/media/deps/milkytracker packages/media/deps/schismtracker && git commit
```

The media service's Dockerfile will automatically build and install both the `milkycli` utility and Schism Tracker during container build.

Note: MilkyTracker submodule is a temporary requirement until [PR #372](https://github.com/milkytracker/MilkyTracker/pull/372) is merged into MilkyTracker's main branch.

### `schismtracker` Installation

Schism Tracker is used for additional module file format support and conversion. The media service's Docker image builds Schism Tracker from source to support multiple architectures.

For local development, you can install it:

```bash
# Build from source (same as Docker)
git clone https://github.com/schismtracker/schismtracker.git
cd schismtracker
git checkout 20250208
autoreconf -i
mkdir -p build && cd build
../configure
make
sudo cp schismtracker /usr/local/bin/
```

### Installation Steps

1. Install system dependencies:

```bash
# macOS
brew install ffmpeg libxmp

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install ffmpeg libxmp4
```

2. Install project dependencies:

```bash
pnpm install
```

3. Set up environment variables:

```bash
# Copy example env files
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env

# Edit the .env files with your configuration
```

4. Set up MinIO:

```bash
# Install MinIO (macOS)
brew install minio/stable/minio

# Start MinIO server
minio server ~/minio --console-address :9001

# Create a bucket named 'wavtopia' using the MinIO Console (http://localhost:9001)
# Default credentials: minioadmin/minioadmin
```

5. Initialize the database:

```bash
# Set up the database schema and run migrations
pnpm db:setup

# Create an admin user and enable required feature flags
pnpm db:bootstrap
```

6. Start development servers:

```bash
# Start all services
pnpm dev

# Or start services individually:
cd packages/frontend && pnpm dev
cd packages/backend && pnpm dev
```

### Utility Scripts

The `scripts/` directory contains several utility scripts:

- `deploy.sh`: Main deployment script with several commands:
  - `setup-remote`: Configure remote Docker context and registry for deployment
  - `deploy-prod`: Deploy all services to production
  - `bootstrap-prod`: Bootstrap the production database with an admin user
  - Run `./scripts/deploy.sh --help` for all available commands
- `apply-arch-lockfile.sh`: Applies architecture-specific lockfile for better dependency management
- `update-arch-lockfile.sh`: Updates the architecture-specific lockfile
- `distribute-env.sh`: Distributes environment variables to package-specific .env files:
  - Takes a source .env file and creates package-specific versions
  - Only includes variables used by each package's config.ts
  - Usage: `./scripts/distribute-env.sh .env.docker`

### Database Management

The project includes several database-related commands:

- `pnpm db:setup`: Initialize the database schema and run migrations
- `pnpm db:bootstrap`: Create an admin user and set up required feature flags
  - Can be run with arguments: `-u <username> -e <email> -p <password>`
  - Will prompt for missing values if not provided
- `./scripts/deploy.sh bootstrap-prod`: Bootstrap the production database (must run `setup-remote` first)

### Docker Services

The project supports both local development and containerized services using Docker Compose profiles:

#### Local Development

For local development, you can run core dependencies (PostgreSQL, MinIO, Redis) while developing services locally:

```bash
# Start core dependencies
docker compose --profile development up -d

# Then run services locally:
cd packages/media && pnpm dev

# Or run all services locally:
pnpm dev
```

Services will be available at:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3002
- Media Service: http://localhost:3001 (when running locally)
- PostgreSQL: localhost:5432
- MinIO: localhost:9000 (API) and localhost:9001 (Console)
- Redis: localhost:6379

#### Production Setup

For running services in containers:

```bash
# Build the workspace (required for media service)
docker compose --profile build build workspace

# Run specific services (e.g., media service)
docker compose --profile production up media

# Run all production services (including core dependencies)
docker compose --profile production up
```

Available profiles:

- `build`: For building service containers
- `production`: For running production-ready services
- `development`: For running development dependencies (database, storage, cache)

Each service has its own Dockerfile and can be configured via environment variables. See `.env.docker.example` for available options.

### Project Structure

```
wavtopia/
├── packages/
│   ├── frontend/        # React frontend application
│   │   ├── src/        # Source files
│   │   └── public/     # Static assets
│   │
│   └── backend/        # Express backend application
│       ├── src/        # Source files
│       └── prisma/     # Database schema and migrations
│
└── README.md          # This file
```

## API Documentation

The backend provides the following main endpoints:

### Authentication

- `POST /api/auth/signup` - Create a new user account
- `POST /api/auth/login` - Log in to existing account
- `GET /api/auth/me` - Get current user info

### Track

- `POST /api/track` - Upload a new track
- `GET /api/track/:id` - Get track details
- `PATCH /api/track/:id` - Update track details
- `DELETE /api/track/:id` - Delete a track
- `GET /api/track/:id/original` - Download file in original format
- `GET /api/track/:id/full` - Download full track WAV
- `GET /api/track/:id/stem/:stemId` - Download stem WAV

### Tracks

- `GET /api/tracks` - List all tracks owned by the current user
- `GET /api/tracks/public` - List all public tracks
- `GET /api/tracks/shared` - List all tracks shared with the current user
- `GET /api/tracks/available` - List all tracks that are accessible to the current user

## Troubleshooting

### Common Issues

1. **"No token provided" error when downloading**

   - Make sure you're logged in
   - Try logging out and back in
   - Check that your token is being stored correctly in localStorage

2. **File upload fails**

   - Check that your file is in a supported format (xm, it, mod)
   - Ensure the file size is under 50MB
   - Verify MinIO is running and accessible

3. **Audio playback issues**
   - Click anywhere on the page first (browser autoplay policy)
   - Check that your browser supports the Web Audio API
   - Verify the track has finished processing

### Environment Setup

Make sure your `.env` files contain the following variables:

```bash
# packages/backend/.env
DATABASE_URL="postgresql://user:password@localhost:5432/wavtopia"
JWT_SECRET="your-secret-key"
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_USER="minioadmin"
MINIO_PASSWORD="minioadmin"
MINIO_BUCKET="wavtopia"
MILKYCLI_PATH="/usr/local/bin/milkycli"

# packages/frontend/.env
VITE_API_URL="http://localhost:3002"
```

## License

MIT
