# Stickies AI - Web Application

Next.js web application for Stickies AI, including:
- The voice input pipeline backend
- Task and learning-stickies APIs
- A **rewards/reinforcement layer** (events, daily stats, streaks, unlocks) used by both web and iOS

## Setup

1. Install dependencies:
```bash
cd packages/web
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database, OpenAI API, and Supabase credentials
```

Required variables include:
- **Database** – `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- **OpenAI** – `OPENAI_API_KEY` (for Whisper and task summarization)
- **Supabase (required for authentication)** – from your [Supabase](https://supabase.com) project (Settings → API):
  - `NEXT_PUBLIC_SUPABASE_URL` – e.g. `https://YOUR_PROJECT_REF.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – your project’s anon/public key
- **Next.js** – `NEXT_PUBLIC_APP_URL=http://localhost:3000` (or your app URL)

3. Initialize the database:
```bash
npm run db:init
# Make sure PostgreSQL is running
# The schema (including rewards tables) will be automatically created on first connection
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

The application includes a web UI for testing both the voice input pipeline and the rewards data:

1. Start the dev server: `npm run dev`
2. Open http://localhost:3000 in your browser
3. Upload an audio file using the form
4. View real-time status and transcription results
5. (Optional, for developers) Visit `http://localhost:3000/rewards` to see the rewards debug UI (effort heatmap, weekly recap, highlights) for the currently logged-in user.

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

### Rewards & Reinforcement
- `POST /api/events` - Record an event such as `task_completed` or `sticky_reviewed`
- `GET /api/rewards/daily-stats` - Aggregated effort stats per day (for heatmaps)
- `GET /api/rewards/weekly-report` - 7-day summary (active days, totals, average effort)
- `GET /api/rewards/highlights` - Simple, derived highlights (best day, consistency)
- `GET /api/rewards/unlocks` - Returns rewards unlocks (e.g., theme unlock after a 7-day streak)

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

