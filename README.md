# Wavtopia

A modern web platform for sharing and downloading multi-track music files.

## Features

- Play and preview music tracks directly in the browser
- Download individual WAV components of each track
- Download original tracker files (.xm format)
- Modern, responsive UI
- Real-time audio playback

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
- PostgreSQL
- FFmpeg
- libxmp

### Setup

1. Install dependencies:

```bash
pnpm install
```

2. Set up environment variables:

```bash
# Copy example env files
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env
```

3. Initialize the database:

```bash
cd packages/backend
pnpm prisma migrate dev
```

4. Start development servers:

```bash
# Start all services
pnpm dev
```

The frontend will be available at http://localhost:5173
The backend API will be available at http://localhost:3000

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

## License

MIT
