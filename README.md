# Stickies AI

An AI-powered dashboard that transforms voice-captured tasks, technical concepts, and news feeds into interactive, habit-forming "Sticky Notes" with automated recall and summarization.

## Prerequisites

### Common Prerequisites (Both Web & iOS)

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **OpenAI API Key** - Required for voice transcription and task summarization - [Get API Key](https://platform.openai.com/api-keys)

### Web App Prerequisites

- **PostgreSQL** (v15 or higher) - See [Database Setup](#database-setup) below
- **FFmpeg** - Required for audio processing - See [FFmpeg Setup](#ffmpeg-setup) below
- **Docker** (optional) - For running PostgreSQL in a container

### iOS App Prerequisites

- **macOS** - Required for iOS development
- **Xcode** (latest version) - [Download from App Store](https://apps.apple.com/us/app/xcode/id497799835)
- **iOS Simulator** - Included with Xcode
- **Web Backend Running** - The iOS app requires the web backend to be running (see [Web App Setup](#web-app-setup) below)

## Quick Start

### Web App Quick Start

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

### iOS App Quick Start

**⚠️ Important:** The iOS app requires the web backend to be running first. Complete the [Web App Setup](#web-app-setup) before proceeding.

1. **Ensure web backend is running** (see [Web App Setup](#web-app-setup) above)

2. **Navigate to the iOS package**:
   ```bash
   cd packages/ios
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

5. **Edit `.env` file**:
   - **For iOS Simulator**: `EXPO_PUBLIC_API_URL=http://localhost:3000`
   - **For Physical Device**: Use your machine's LAN IP, e.g. `EXPO_PUBLIC_API_URL=http://192.168.1.100:3000`
   
   To find your LAN IP:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

6. **Start the Expo development server**:
   ```bash
   npm start
   ```

7. **Launch iOS Simulator**:
   - Press `i` in the Expo terminal, or
   - Run `npm run ios` in a new terminal

**⚠️ Important:** If you see any package compatibility error message, make sure to fix it by installing the suggested version! Below is one example:
```bash
The following packages should be updated for best compatibility with the installed expo version: 
@shopify/flash-list@2.2.2 - expected version: 1.7.3 
expo@52.0.48 - expected version: ~52.0.49 
react-native@0.76.3 - expected version: 0.76.9 Your project may not work correctly until you install the expected versions of the packages.
```
Fix it by running:
```bash
npx expo install expo@~52.0.49
npx expo install react-native@0.76.9
npx expo install @shopify/flash-list@1.7.3
```

8. **The app should open in the iOS Simulator** and connect to the Metro bundler automatically.

## Detailed Setup Instructions

## Web App Setup

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

### 5. Running the Web App

#### Development Mode

Start the Next.js development server:

```bash
cd packages/web
npm run dev
```

The app will be available at `http://localhost:3000`.

#### Production Build

Build and run the production version:

```bash
cd packages/web
npm run build
npm start
```

### Web App Available Scripts

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

### Web App Features

Once the web app is running, you can:

- **Upload audio files** for transcription using OpenAI Whisper
- **View transcription status** in real-time
- **See transcription results** with detailed segments
- **Automatically summarize** transcripts into structured tasks and reminders
- **Manage tasks** through the API or web interface

## Web API Documentation

The iOS app communicates with the web backend API. For detailed API documentation, see [packages/web/API_DOCUMENTATION.md](packages/web/API_DOCUMENTATION.md).

### Key API Endpoints

- `POST /api/voice/upload` - Upload audio file for transcription
- `GET /api/voice/status/:ingestionId` - Get transcription status
- `GET /api/voice/transcript/:ingestionId` - Get transcription result
- `POST /api/voice/summarize/:ingestionId` - Summarize transcript into tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/task/:taskId` - Get a specific task
- `PATCH /api/task/:taskId` - Update a task
- `DELETE /api/task/:taskId` - Delete a task

## Web App Troubleshooting

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

## iOS Troubleshooting

### Could Not Connect to Development Server

If you see "Could not connect to development server" error:

1. **Verify Metro bundler is running**:
   - Check that `npm start` is running in `packages/ios`
   - You should see "Metro waiting on exp://..." in the terminal

2. **Reload the app**:
   - Press `r` in the Metro terminal, or
   - Shake simulator (Cmd+Ctrl+Z) → Reload, or
   - Press Cmd+R in the simulator

3. **Restart the simulator**:
   - Close iOS Simulator
   - Press `i` in the Metro terminal to reopen it

4. **Check Expo Go version**:
   - If using Expo Go, ensure it matches the SDK version
   - Update Expo Go from the App Store if needed

5. **Clear Metro cache**:
   ```bash
   cd packages/ios
   npm start -- --reset-cache
   ```

### Expo Go Version Mismatch

If you see version mismatch warnings:

- **Recommended**: Use the version suggested by Expo
- **Or**: Switch to development build (press `s` in Metro terminal)
- **Or**: Update Expo Go from the App Store on your device/simulator

### API Connection Issues

If the app can't connect to the backend:

1. **Verify backend is running**:
   ```bash
   # Check if web backend is running
   curl http://localhost:3000/api/tasks
   ```

2. **Check `.env` configuration**:
   - Simulator: `EXPO_PUBLIC_API_URL=http://localhost:3000`
   - Physical device: Use your machine's LAN IP (not `localhost`)

3. **Find your machine's IP**:
   ```bash
   ipconfig getifaddr en0  # macOS
   ```

4. **Test connectivity from device**:
   - Open Safari on your device/simulator
   - Navigate to `http://YOUR_IP:3000`
   - Should see the web app or API response

### Metro Bundler Port Already in Use

If port 8081 is already in use:

```bash
# Find what's using the port
lsof -i :8081

# Kill the process or use a different port
# In Expo, you can specify a port:
npx expo start --port 8082
```

### Xcode or Simulator Issues

- **Simulator won't start**: Open Xcode → Window → Devices and Simulators → Start simulator manually
- **Build errors**: Run `cd packages/ios && npm install` to ensure dependencies are installed
- **Permission errors**: Ensure Xcode Command Line Tools are installed: `xcode-select --install`

## iOS App Setup

A React Native (Expo) iOS app is available in `packages/ios` with a polished UI.

**⚠️ Prerequisites:** Before setting up the iOS app, ensure:
1. The web backend is set up and running (see [Web App Setup](#web-app-setup) above)
2. Xcode is installed on your Mac
3. iOS Simulator is available (comes with Xcode)

### Step-by-Step iOS Setup

#### 1. Install Dependencies

Navigate to the iOS package and install dependencies:

```bash
cd packages/ios
npm install
```

#### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set the API URL:

**For iOS Simulator:**
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

**For Physical Device:**
```env
EXPO_PUBLIC_API_URL=http://YOUR_MACHINE_IP:3000
```

To find your machine's IP address:
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Or use this command
ipconfig getifaddr en0
```

#### 3. Ensure Web Backend is Running

The iOS app requires the web backend to be running. In a separate terminal:

```bash
cd packages/web
npm run dev
```

Verify the backend is accessible:
- Simulator: `http://localhost:3000` should be reachable
- Physical device: `http://YOUR_MACHINE_IP:3000` should be reachable from your device

#### 4. Start Expo Development Server

Start the Metro bundler (Expo development server):

```bash
cd packages/ios
npm start
```

You should see:
- A QR code in the terminal
- Metro bundler waiting on `exp://...:8081`
- Options to press `i` for iOS simulator, `a` for Android, etc.

#### 5. Launch iOS Simulator

**Option A: From Expo Terminal**
- Press `i` in the Expo terminal window

**Option B: From Command Line**
- In a new terminal: `cd packages/ios && npm run ios`

**Option C: Manual Launch**
- Open Xcode → Window → Devices and Simulators
- Start a simulator
- Shake the simulator (Cmd+Ctrl+Z) → Reload

#### 6. Verify Connection

Once the app opens in the simulator:
- You should see the login screen
- If you see "Could not connect to development server", see [Troubleshooting](#ios-troubleshooting) below

### iOS App Features

- **Voice & Text Input** - Record voice or type text to capture thoughts and ideas
- **Automatic Task Extraction** - AI automatically converts voice/text into structured tasks with titles, descriptions, priorities, and due dates
- **Learning Area Generation** - AI generates flashcard-style learning stickies organized by domain/topic
- **Flip-Card Learning** - Tap-to-flip flashcards with concept/definition for spaced repetition
- **Task Management** - View, edit, complete, and delete tasks with full CRUD operations
- **Feed View** - Unified home feed displaying both tasks and learning stickies
- **Real-time Transcription** - Live voice transcription with status updates using OpenAI Whisper
- **Multi-user Support** - Mock user authentication with AsyncStorage persistence

### iOS App Available Scripts

From the `packages/ios` directory:

- `npm start` - Start Expo development server (Metro bundler)
- `npm run ios` - Start Expo and launch iOS simulator
- `npm run android` - Start Expo and launch Android emulator
- `npm run web` - Start Expo web version

### UI Design

The iOS app features a complete production-ready UI redesign following Apple's Human Interface Guidelines:

- ✅ **Minimal cognitive load** - Clear hierarchy, consistent spacing
- ✅ **Micro-interactions** - Haptic feedback on interactions
- ✅ **Calm design** - Pastel colors, subtle shadows
- ✅ **Encouragement** - Positive empty states and friendly messaging

See [packages/ios/UI_IMPROVEMENTS.md](packages/ios/UI_IMPROVEMENTS.md) for detailed changes and [packages/ios/README.md](packages/ios/README.md) for additional setup instructions.

## Project Structure

```
Stickies-AI/
├── packages/
│   ├── web/                      # Next.js web application
│   │   ├── src/
│   │   │   ├── app/              # Next.js app directory (routes, pages)
│   │   │   ├── components/       # React components
│   │   │   ├── lib/              # Core libraries (db, audio, llm, auth)
│   │   │   └── hooks/            # React hooks
│   │   ├── .env.example          # Environment variables template
│   │   ├── README.md             # Web package documentation
│   │   ├── API_DOCUMENTATION.md  # API endpoints documentation
│   │   ├── DATABASE_SETUP.md     # Database setup guide
│   │   ├── FFMPEG_SETUP.md       # FFmpeg installation guide
│   │   ├── TESTING.md            # Testing guide
│   │   └── SECURITY.md           # Security guide
│   └── ios/                      # Expo React Native iOS app
│       ├── app/                  # Expo Router screens
│       │   ├── (tabs)/           # Tab navigation screens
│       │   ├── _layout.tsx       # Root layout with gesture handler
│       │   ├── login.tsx         # User login screen
│       │   └── add-note.tsx      # Voice/text input modal
│       ├── src/
│       │   ├── api/
│       │   ├── components/       # UI components
│       │   ├── hooks/            # Custom React hooks
│       │   ├── theme/
│       │   ├── utils/
│       │   └── types/
│       ├── .env.example          # Environment variables template
│       ├── package.json          # iOS dependencies
│       ├── app.json              # Expo configuration
│       ├── README.md             # iOS app documentation
│       └── UI_IMPROVEMENTS.md    # UI improvements guide
├── docker-compose.yml            # Docker Compose configuration
└── README.md                     # This file
```

## Additional Resources

- [Database Setup Guide](packages/web/DATABASE_SETUP.md)
- [FFmpeg Setup Guide](packages/web/FFMPEG_SETUP.md)
- [iOS App Setup](packages/ios/README.md)
- [iOS UI Improvements](packages/ios/UI_IMPROVEMENTS.md)
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
