# Stickies AI

An AI-powered dashboard that transforms voice-captured tasks, technical concepts, and news feeds into interactive, habit-forming "Sticky Notes" with automated recall and summarization.

## Prerequisites

Before running the app, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v15 or higher) - See [Database Setup](#database-setup) below
- **FFmpeg** - Required for audio processing - See [FFmpeg Setup](#ffmpeg-setup) below
- **OpenAI API Key** - Required for voice transcription and task summarization
- **Docker** (optional) - For running PostgreSQL in a container

## Quick Start

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd Stickies-AI
   ```

2. **Navigate to the web package**:
   ```bash
   cd packages/web
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your database and OpenAI API credentials
   ```

5. **Set up the database** (see [Database Setup](#database-setup) below)

6. **Install FFmpeg** (see [FFmpeg Setup](#ffmpeg-setup) below)

7. **Run the development server**:
   ```bash
   npm run dev
   ```

8. **Open your browser** and navigate to:
   ```
   http://localhost:3000
   ```

## Detailed Setup Instructions

### 1. Install Dependencies

Navigate to the web package and install all required dependencies:

```bash
cd packages/web
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure it with your credentials:

```bash
cp .env.example .env
```

Edit `.env` with the following required variables:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stickies_ai
DB_USER=postgres
DB_PASSWORD=your_password_here

# OpenAI API Configuration (Required)
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Task Summarizer Configuration
TASK_SUMMARIZER_MODEL=gpt-4o-mini
TASK_SUMMARIZER_TEMPERATURE=0.3

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important**: Replace `your_openai_api_key_here` with your actual OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys).

### 3. Database Setup

The application requires PostgreSQL. You have three options:

#### Option A: Docker Compose (Recommended for Development)

The easiest way to run PostgreSQL is using Docker Compose:

```bash
# From the project root directory
docker-compose up -d

# Wait a few seconds for PostgreSQL to start, then initialize the database
cd packages/web
npm run db:init
```

This will:
- Start PostgreSQL in a Docker container
- Create the database `stickies_ai`
- Initialize the schema automatically

#### Option B: Local PostgreSQL Installation

If you prefer to install PostgreSQL locally:

**macOS (using Homebrew)**:
```bash
brew install postgresql@15
brew services start postgresql@15
createdb stickies_ai
```

**Linux (Ubuntu/Debian)**:
```bash
sudo apt-get update
sudo apt-get install postgresql-15
sudo systemctl start postgresql
createdb stickies_ai
```

**Windows**: Download and install from [PostgreSQL Downloads](https://www.postgresql.org/download/windows/)

After installation, initialize the database:
```bash
cd packages/web
npm run db:init
```

#### Option C: Cloud Database (Production)

For production, you can use cloud services like:
- **Supabase** (Free tier available): https://supabase.com
- **Neon** (Free tier available): https://neon.tech

Update your `.env` file with the cloud database connection details.

For more detailed database setup instructions, see [packages/web/DATABASE_SETUP.md](packages/web/DATABASE_SETUP.md).

### 4. FFmpeg Setup

FFmpeg is required for audio normalization. Install it based on your operating system:

**macOS**:
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian)**:
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Windows**:
```bash
# Using Chocolatey
choco install ffmpeg
```

Verify installation:
```bash
ffmpeg -version
```

For more detailed FFmpeg setup instructions, see [packages/web/FFMPEG_SETUP.md](packages/web/FFMPEG_SETUP.md).

### 5. Initialize Database Schema

After setting up PostgreSQL and configuring your `.env` file, initialize the database schema:

```bash
cd packages/web
npm run db:init
```

You should see:
```
Testing database connection...
Database connection successful
Initializing database schema...
Database schema initialized successfully
Database initialization complete
Done
```

## Running the Application

### Development Mode

Start the Next.js development server:

```bash
cd packages/web
npm run dev
```

The app will be available at `http://localhost:3000`.

### Production Build

Build and run the production version:

```bash
cd packages/web
npm run build
npm start
```

## Available Scripts

From the `packages/web` directory:

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests with Vitest
- `npm run db:init` - Initialize database schema
- `npm run test:db` - Test database connection
- `npm run test:audio` - Test audio processing
- `npm run test:whisper` - Test Whisper API integration
- `npm run test:api` - Test API endpoints
- `npm run test:summarize` - Test task summarization

## Features

Once the app is running, you can:

- **Upload audio files** for transcription using OpenAI Whisper
- **View transcription status** in real-time
- **See transcription results** with detailed segments
- **Automatically summarize** transcripts into structured tasks and reminders
- **Manage tasks** through the API or web interface

## API Documentation

For detailed API documentation, see [packages/web/API_DOCUMENTATION.md](packages/web/API_DOCUMENTATION.md).

### Key API Endpoints

- `POST /api/voice/upload` - Upload audio file for transcription
- `GET /api/voice/status/:ingestionId` - Get transcription status
- `GET /api/voice/transcript/:ingestionId` - Get transcription result
- `POST /api/voice/summarize/:ingestionId` - Summarize transcript into tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/task/:taskId` - Get a specific task
- `PATCH /api/task/:taskId` - Update a task
- `DELETE /api/task/:taskId` - Delete a task

## Troubleshooting

### Database Connection Issues

If you see `ECONNREFUSED` errors:

1. **Check if PostgreSQL is running**:
   ```bash
   # For Docker
   docker ps | grep postgres
   
   # For local installation (macOS)
   brew services list | grep postgresql
   ```

2. **Verify your `.env` configuration** matches your PostgreSQL setup

3. **Check if the database exists**:
   ```bash
   psql -U postgres -l | grep stickies_ai
   ```

See [packages/web/DATABASE_SETUP.md](packages/web/DATABASE_SETUP.md) for more troubleshooting tips.

### FFmpeg Not Found

If you get FFmpeg-related errors:

1. **Verify FFmpeg is installed**:
   ```bash
   ffmpeg -version
   ```

2. **Check if FFmpeg is in your PATH**:
   ```bash
   which ffmpeg
   ```

See [packages/web/FFMPEG_SETUP.md](packages/web/FFMPEG_SETUP.md) for more troubleshooting tips.

### OpenAI API Errors

If you encounter API errors:

1. **Verify your API key** is correct in `.env`
2. **Check your OpenAI account** has sufficient credits
3. **Verify API key permissions** allow Whisper API access

### Port Already in Use

If port 3000 is already in use:

```bash
# Find what's using the port
lsof -i :3000

# Kill the process or use a different port
# In Next.js, you can specify a port:
PORT=3001 npm run dev
```

## iOS App (Draft)

A React Native (Expo) iOS app is available in `packages/ios`. It records voice, uploads to the web API for transcription and summarization, and displays tasks.

```bash
cd packages/ios
npm install
cp .env.example .env   # Set EXPO_PUBLIC_API_URL (localhost for simulator)
npm start
# Press i for iOS Simulator
```

See [packages/ios/README.md](packages/ios/README.md) for setup and usage.

## Project Structure

```
Stickies-AI/
├── packages/
│   ├── web/              # Next.js web application
│   │   ├── src/
│   │   │   ├── app/      # Next.js app directory (routes, pages)
│   │   │   ├── components/  # React components
│   │   │   ├── lib/      # Core libraries (db, audio, llm, auth)
│   │   │   └── hooks/    # React hooks
│   │   ├── .env.example  # Environment variables template
│   │   └── README.md     # Web package documentation
│   └── ios/              # Expo React Native iOS app (draft)
│       ├── app/          # Expo Router screens
│       ├── src/          # API client, components, hooks
│       └── README.md     # iOS app documentation
├── docker-compose.yml    # Docker Compose configuration
└── README.md            # This file
```

## Additional Resources

- [Database Setup Guide](packages/web/DATABASE_SETUP.md)
- [FFmpeg Setup Guide](packages/web/FFMPEG_SETUP.md)
- [iOS App (Draft)](packages/ios/README.md)
- [API Documentation](packages/web/API_DOCUMENTATION.md)
- [Testing Guide](packages/web/TESTING.md)
- [Security Guide](packages/web/SECURITY.md)

## Getting Help

If you encounter issues not covered in this README:

1. Check the detailed guides in `packages/web/` directory
2. Review the troubleshooting sections in each guide
3. Check the project's issue tracker (if available)

## License

[Add your license information here]
