# iOS App Draft – Stickies AI

## Overview

Draft React Native (Expo) iOS app that integrates with the existing Stickies AI voice and task APIs. Records voice, uploads to the web backend for transcription and summarization, and displays tasks.

## Tech Stack

- **Framework**: Expo (React Native) with TypeScript
- **Navigation**: Expo Router (file-based)
- **Audio**: `expo-av` for recording
- **Storage**: `@react-native-async-storage/async-storage` for session (userId)
- **HTTP**: `fetch` with base URL config

## Features (Draft)

1. **Login** – Pick mock user (shirley, yixiao, guest), store `userId`, send `X-User-Id` on API calls.
2. **Home** – Record voice → upload → poll status → summarize → show transcript + tasks.
3. **Tasks** – List tasks, tap to mark complete (PATCH), pull-to-refresh.

## File Structure

```
packages/ios/
├── app/
│   ├── _layout.tsx          # Root layout, auth check
│   ├── index.tsx            # Redirect to login or home
│   ├── login.tsx            # Mock user picker
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab navigator
│   │   ├── index.tsx        # Home (record + latest result)
│   │   └── tasks.tsx        # Task list
├── src/
│   ├── api/
│   │   └── client.ts        # Base URL, X-User-Id, fetch wrappers
│   ├── components/
│   │   ├── VoiceRecorder.tsx
│   │   └── TaskCard.tsx
│   ├── hooks/
│   │   ├── useVoiceUpload.ts
│   │   └── useAuth.ts
│   └── types/
│       └── index.ts
├── app.json
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## API Integration

- **Base URL**: Configurable (e.g. `http://localhost:3000` for simulator; use machine IP for device).
- **Auth**: `X-User-Id: <userId>` on all requests to voice/task endpoints.
- **Endpoints**:
  - `POST /api/voice/upload` (multipart) → `ingestionId`
  - `GET /api/voice/status/:ingestionId`
  - `GET /api/voice/transcript/:ingestionId`
  - `POST /api/voice/summarize/:ingestionId`
  - `GET /api/tasks`, `GET /api/tasks/:ingestionId`
  - `PATCH /api/task/:taskId` (e.g. `{ "completed": true }`)

## Implementation Steps

1. Create Expo app with TypeScript and Expo Router.
2. Add `expo-av`, `@react-native-async-storage/async-storage`, `expo-file-system`.
3. Implement API client with base URL and `X-User-Id`.
4. Add login screen and `useAuth` (store/read userId).
5. Add Home: `VoiceRecorder` + `useVoiceUpload` (record → upload → poll → summarize).
6. Add Tasks tab: fetch tasks, `TaskCard`, PATCH for completion.
7. Add README and `.env.example` (e.g. `EXPO_PUBLIC_API_URL`).

## Dependencies

- `expo` / `expo-av` / `expo-file-system` / `expo-router`
- `@react-native-async-storage/async-storage`
- TypeScript, `@types/react`

## Notes

- **Simulator**: Use `http://localhost:3000` or `http://127.0.0.1:3000`.
- **Device**: Use your machine’s LAN IP (e.g. `http://192.168.1.x:3000`).
- **Auth**: Mock users only; no real auth in this draft.
- **Microphone**: Request permissions; handle denials gracefully.
