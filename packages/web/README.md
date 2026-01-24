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

4. Install Tailwind CSS dependencies (if not already installed):
```bash
npm install
```

5. Run the development server:
```bash
npm run dev
```

6. Open your browser and navigate to:
```
http://localhost:3000
```

You'll see a web interface where you can:
- Upload audio files
- View transcription status
- See transcription results with segments

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

## Web Interface

The application includes a web UI for testing the voice input pipeline:

1. Start the dev server: `npm run dev`
2. Open http://localhost:3000 in your browser
3. Upload an audio file using the form
4. View real-time status and transcription results

## API Routes

### Voice Transcription
- `POST /api/voice/upload` - Upload audio file for transcription
- `GET /api/voice/status/:ingestionId` - Get transcription status
- `GET /api/voice/transcript/:ingestionId` - Get transcription result
- `POST /api/voice/summarize/:ingestionId` - Summarize transcript into tasks/reminders

### Tasks Management
- `GET /api/tasks` - Get all tasks (with optional filters)
- `GET /api/tasks/:ingestionId` - Get tasks for a specific ingestion
- `GET /api/task/:taskId` - Get a specific task by ID
- `PATCH /api/task/:taskId` - Update a task (e.g., mark as completed)
- `DELETE /api/task/:taskId` - Delete a task

See `API_DOCUMENTATION.md` for detailed API documentation.

## Task Summarization

After transcribing a voice input, you can automatically convert the transcript into structured tasks and reminders using AI:

1. Upload and transcribe audio: `POST /api/voice/upload`
2. Wait for transcription to complete (check status: `GET /api/voice/status/:ingestionId`)
3. Summarize into tasks: `POST /api/voice/summarize/:ingestionId`
4. Retrieve tasks: `GET /api/tasks/:ingestionId`

The summarization uses OpenAI's GPT models to extract actionable items from the transcript, including:
- Task titles and descriptions
- Priority levels (low, medium, high)
- Due dates (parsed from natural language)
- Task types (task, reminder, note)

### Debug Example

```bash
# 1. Upload an audio file
curl -X POST http://localhost:3000/api/voice/upload \
  -F "file=@/path/to/your/audio.m4a" \
  -F "language=en"

# Response will include an ingestionId, e.g.:
# {"ingestionId": "1769217532231-f005dfbb-a4a6-43e2-9533-704211d455e0", ...}

# 2. Summarize the transcript into tasks
npm run test:summarize <ingestionId>

# Example:
npm run test:summarize 1769217532231-f005dfbb-a4a6-43e2-9533-704211d455e0
```
