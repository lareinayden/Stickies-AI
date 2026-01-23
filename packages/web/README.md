# Stickies AI - Web Application

Next.js web application for Stickies AI, including the voice input pipeline backend.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database and API credentials
```

3. Initialize the database:
```bash
# Make sure PostgreSQL is running
# The schema will be automatically created on first connection
```

4. Run the development server:
```bash
npm run dev
```

## Database Setup

The application uses PostgreSQL. Make sure you have:
- PostgreSQL installed and running
- Database created (default: `stickies_ai`)
- Environment variables configured in `.env`

The database schema will be automatically initialized on first connection.

See `DATABASE_SETUP.md` for detailed setup instructions.

## FFmpeg Setup

The audio normalization service requires FFmpeg to be installed on your system.

### macOS
```bash
brew install ffmpeg
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

### Windows
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

Verify installation:
```bash
ffmpeg -version
```

## API Routes

- `POST /api/voice/upload` - Upload audio file for transcription
- `GET /api/voice/status/:ingestionId` - Get transcription status
- `GET /api/voice/transcript/:ingestionId` - Get transcription result
