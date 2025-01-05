# Wavtopia

<img src="wavtopia-icon.png" alt="Wavtopia Icon" width="128" height="128" />

A modern web platform for sharing and downloading multi-track music files. Wavtopia allows you to upload tracker music files (.xm format) and automatically converts them into individual WAV components and a full track WAV file.

## Features

- **Track Management**: Upload, manage, and share your music tracks
- **Audio Conversion**: Automatic conversion of .xm files to WAV format
- **Component Extraction**: Split tracks into individual instrument components
- **Multi-format Downloads**:
  - Download the original tracker file (.xm)
  - Download the full track as WAV
  - Download individual instrument components as WAV
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
- export-to-wav utility (see below)

### export-to-wav Installation

The project requires the `export-to-wav` utility from MilkyTracker for converting XM files to WAV format. Currently, this utility is only available in [this open pull request](https://github.com/milkytracker/MilkyTracker/pull/372). To install it:

1. Clone MilkyTracker and checkout the PR branch:

```bash
git clone https://github.com/trh-x/MilkyTracker.git
cd MilkyTracker
git checkout trh/export-to-wav
```

2. Build MilkyTracker with the export-to-wav utility:

```bash
./build.sh
```

3. The utility will be available at `build/src/tools/export-to-wav/export-to-wav`. Copy or symlink it to a location in your PATH (e.g., /usr/local/bin/).

Note: This is hopefully a temporary requirement until [PR #372](https://github.com/milkytracker/MilkyTracker/pull/372) is merged into MilkyTracker's main branch.

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
cd packages/backend
pnpm prisma migrate dev
```

6. Start development servers:

```bash
# Start all services
pnpm dev

# Or start services individually:
cd packages/frontend && pnpm dev
cd packages/backend && pnpm dev
```

The frontend will be available at http://localhost:5173
The backend API will be available at http://localhost:3000
The MinIO Console will be available at http://localhost:9001

## Project Structure

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
- `GET /api/track/:id/original` - Download original .xm file
- `GET /api/track/:id/full` - Download full track WAV
- `GET /api/track/:id/component/:componentId` - Download component WAV

### Tracks

- `GET /api/tracks` - List all tracks owned by the current user
- `GET /api/tracks/public` - List all public tracks
- `GET /api/tracks/shared` - List all tracks shared with the current user
- `GET /api/tracks/all` - List all tracks that are accessible to the current user

## Troubleshooting

### Common Issues

1. **"No token provided" error when downloading**

   - Make sure you're logged in
   - Try logging out and back in
   - Check that your token is being stored correctly in localStorage

2. **File upload fails**

   - Check that your file is in .xm format
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
MINIO_ROOT_USER="minioadmin"
MINIO_ROOT_PASSWORD="minioadmin"
MINIO_BUCKET="wavtopia"
EXPORT_TO_WAV_PATH="/usr/local/bin/export-to-wav"

# packages/frontend/.env
VITE_API_URL="http://localhost:3000"
```

## License

MIT
