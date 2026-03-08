# Supabase Authentication Implementation Plan

## Overview

Replace the current mock authentication (3 hardcoded test accounts: Shirley, Yixiao, Guest) with **Supabase Auth** to allow real users to sign up and sign in.

## Why Supabase

- **Built-in auth**: Email/password + OAuth (Google, GitHub, etc.) out of the box
- **Works everywhere**: Next.js (web) and React Native (iOS) via same SDK
- **Free tier**: 50,000 MAU, sufficient for testing and early production
- **JWT-based**: Easy to validate tokens in API routes
- **No custom backend**: No need to manage passwords, sessions, or user storage

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web (Next.js) │     │   iOS (Expo)    │     │   API Routes    │
│                 │     │                 │     │   (Next.js)     │
│  Supabase Client│     │  Supabase Client│     │                 │
│  - signIn       │     │  - signIn       │     │  - Validate JWT │
│  - signUp       │     │  - signUp       │     │  - Extract      │
│  - session      │     │  - session      │     │    user.id      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  Bearer JWT           │  Bearer JWT           │
         └───────────────────────┴───────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  Supabase Auth          │
                    │  (auth.supabase.co)     │
                    │  - User management      │
                    │  - JWT issuance         │
                    └─────────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  Existing PostgreSQL   │
                    │  (transcriptions,     │
                    │   tasks, etc.)        │
                    │  user_id = UUID       │
                    │  (Supabase auth id)   │
                    └─────────────────────────┘
```

## User ID Migration

- **Current**: `user_id` is string (`'shirley'`, `'yixiao'`, `'guest'`)
- **New**: `user_id` is Supabase Auth UUID (e.g. `550e8400-e29b-41d4-a716-446655440000`)
- **Existing data**: Mock user data can remain for backward compat during dev, or migrate to Supabase users
- **Schema**: `user_id VARCHAR(255)` already supports UUIDs; no schema change required

## Implementation Steps

### Phase 1: Supabase Setup

1. Create Supabase project at https://supabase.com
2. Enable Email auth (and optionally Google/GitHub OAuth)
3. Get `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. For server-side JWT verification: use same anon key (Supabase validates JWT)

### Phase 2: Web Package

1. Install `@supabase/supabase-js` and `@supabase/ssr` (for Next.js cookies)
2. Create `lib/supabase/client.ts` (browser client)
3. Create `lib/supabase/server.ts` (server client for API/middleware)
4. Replace login page: email/password form + sign up link
5. Add auth callback route for OAuth redirects (`/auth/callback`)

### Phase 3: iOS Package

1. Install `@supabase/supabase-js` (works with Expo)
2. Install `expo-secure-store` for secure session storage (optional; AsyncStorage works)
3. Create `src/lib/supabase.ts` client
4. Replace login screen: email/password form + sign up
5. Update API client to send `Authorization: Bearer <access_token>`
6. Update `useAuth` hook to use Supabase session

### Phase 4: API Middleware

1. Update `getUserIdFromRequest()`:
   - Prefer `Authorization: Bearer <jwt>`
   - Validate JWT via Supabase `auth.getUser(jwt)`
   - Extract `user.id` (UUID)
   - Fallback: `X-User-Id` for dev (optional, env-gated)
2. Remove hardcoded `isValidUserId()` check for production

### Phase 5: Auth API Routes

1. `POST /api/auth/session` – keep for cookie-based web session (Supabase handles cookies via @supabase/ssr)
2. `GET /api/auth/session` – return current user from Supabase session
3. `POST /api/auth/login` – optional; Supabase client handles signIn directly
4. `POST /api/auth/signup` – optional; Supabase client handles signUp directly
5. `POST /api/auth/logout` – clear Supabase session

## File Changes

### New Files

```
packages/web/src/
  lib/
    supabase/
      client.ts       # Browser Supabase client
      server.ts       # Server Supabase client
  app/
    auth/
      callback/
        route.ts      # OAuth callback
packages/ios/src/
  lib/
    supabase.ts       # Supabase client
```

### Modified Files

```
packages/web/
  package.json           # Add @supabase/supabase-js, @supabase/ssr
  src/
    lib/
      auth/
        middleware.ts    # Validate Supabase JWT
        users.ts         # Deprecate or remove (Supabase is source of truth)
    app/
      login/
        page.tsx         # Email/password sign in + sign up
      layout.tsx         # Optional: Supabase session provider
packages/ios/
  package.json           # Add @supabase/supabase-js
  src/
    api/
      client.ts          # Send Bearer token
    hooks/
      useAuth.ts         # Supabase session
  app/
    login.tsx            # Email/password sign in + sign up
```

## Environment Variables

### Web (packages/web/.env)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### iOS (packages/ios/.env)

```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_API_URL=http://localhost:3000  # or production URL
```

## Backward Compatibility

- **Dev mode**: Optional `ALLOW_MOCK_USERS=true` to still accept `X-User-Id` with shirley/yixiao/guest for local testing without Supabase
- **Migration**: Existing mock user data stays in DB; new users get UUIDs; no data migration required for new auth

## Security Notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code
- Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client and API validation (Supabase JWT is signed, safe to verify with anon key)
- Enable Row Level Security (RLS) on Supabase if using Supabase DB for app data; we use our own PostgreSQL, so RLS is in our API layer via `user_id` filtering
