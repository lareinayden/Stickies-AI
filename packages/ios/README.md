# Stickies AI – iOS App (Draft)

React Native (Expo) iOS app that records voice, uploads to the Stickies AI web backend for transcription and summarization, and displays tasks.

## Prerequisites

- Node.js 18+
- iOS Simulator (Xcode) or physical device
- Stickies AI web backend running (`packages/web`, `npm run dev`)
- [Expo Go](https://expo.dev/go) on device (optional, for quick testing)

## Setup

1. **Install dependencies**

   ```bash
   cd packages/ios
   npm install
   ```

2. **Configure API URL**

   ```bash
   cp .env.example .env
   ```

   Edit `.env`:

   - **Simulator**: `EXPO_PUBLIC_API_URL=http://localhost:3000`
   - **Physical device**: use your machine’s LAN IP, e.g. `EXPO_PUBLIC_API_URL=http://192.168.1.100:3000`

3. **Start the web backend**

   From `packages/web`:

   ```bash
   npm run dev
   ```

## Run

```bash
cd packages/ios
npm start
```

Then:

- Press `i` for iOS Simulator, or
- Scan the QR code with Expo Go on your device.

## Flow

1. **Login** – Pick a mock user (Shirley, Yixiao, Guest). Stored locally; `X-User-Id` is sent on API calls.
2. **Home** – Tap to record (~10 s) → upload → transcribe → summarize → show transcript and extracted tasks.
3. **Tasks** – List all tasks, pull-to-refresh, tap checkbox to mark complete.
4. **Account** – Log out to switch user.

## Project structure

```
packages/ios/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout
│   ├── index.tsx           # Redirect to login or tabs
│   ├── login.tsx           # Mock user picker
│   └── (tabs)/
│       ├── _layout.tsx     # Tab navigator
│       ├── index.tsx       # Home (record + latest result)
│       ├── tasks.tsx       # Task list
│       └── account.tsx     # Log out
├── src/
│   ├── api/client.ts       # Voice & task API client
│   ├── components/         # VoiceRecorder, TaskCard
│   ├── hooks/              # useAuth, useVoiceUpload
│   └── types/              # Task, MockUser, etc.
├── assets/
├── .env.example
└── README.md
```

## API

The app talks to the web backend:

- `POST /api/voice/upload` – upload recording
- `GET /api/voice/status/:ingestionId`
- `GET /api/voice/transcript/:ingestionId`
- `POST /api/voice/summarize/:ingestionId`
- `GET /api/tasks`, `PATCH /api/task/:taskId`

All requests use `X-User-Id` for auth (mock users).

## Notes

- **Draft**: Recording is fixed-length (~10 s); add a stop button for production.
- **Simulator vs device**: Use `localhost` for simulator; use your machine’s IP for a physical device.
- **Auth**: Mock users only; no real authentication.
