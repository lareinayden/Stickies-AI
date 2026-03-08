# Supabase Setup Steps for Stickies AI

Follow these steps on the **Supabase website** to register your project and get the credentials needed for authentication.

---

## 1. Create a Supabase account and project

1. Go to **[https://supabase.com](https://supabase.com)** and sign up or log in.
2. Click **“New project”**.
3. Fill in:
   - **Name**: e.g. `Stickies AI` (or any name you like).
   - **Database password**: choose a strong password and **store it safely** (you need it for direct DB access; the app uses the anon key, not this password).
   - **Region**: pick one close to you.
4. Click **“Create new project”** and wait until the project is ready (a few minutes).

---

## 2. Get your project URL and anon key

1. In the Supabase dashboard, open your project.
2. In the left sidebar, go to **Project Settings** (gear icon).
3. Open the **API** section.
4. Copy:
   - **Project URL** (e.g. `https://xxxxxxxxxxxx.supabase.co`) → use as `NEXT_PUBLIC_SUPABASE_URL` (web) and `EXPO_PUBLIC_SUPABASE_URL` (iOS).
   - **anon public** key (under “Project API keys”) → use as `NEXT_PUBLIC_SUPABASE_ANON_KEY` (web) and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (iOS).

**Important:** Use only the **anon public** key in your app. Do **not** put the `service_role` key in frontend or mobile code.

---

## 3. Enable Email auth (and optional OAuth)

1. In the left sidebar, go to **Authentication** → **Providers**.
2. **Email** is usually enabled by default.
   - Under **Email**, you can leave “Confirm email” on or turn it off for faster local testing (no confirmation email).
3. (Optional) To enable **Google** or **GitHub** sign-in:
   - Click the provider (e.g. Google), toggle **Enable**, and follow the instructions to add OAuth credentials.
   - For OAuth to work on the web, add your site URL under **Authentication** → **URL Configuration** (see step 4).

---

## 4. Configure URLs (for web OAuth and redirects)

1. Go to **Authentication** → **URL Configuration**.
2. Set **Site URL** to your app’s base URL, e.g.:
   - Local: `http://localhost:3000`
   - Production: `https://yourdomain.com`
3. Under **Redirect URLs**, add:
   - `http://localhost:3000/auth/callback` (local web)
   - Your production callback if you have one, e.g. `https://yourdomain.com/auth/callback`

Save changes.

---

## 5. Set environment variables locally

### Web (`packages/web`)

1. Copy the example env file:
   ```bash
   cp packages/web/.env.example packages/web/.env
   ```
2. Edit `packages/web/.env` and set:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Project URL from step 2.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon public key from step 2.

### iOS (`packages/ios`)

1. Copy the example env file:
   ```bash
   cp packages/ios/.env.example packages/ios/.env
   ```
2. Edit `packages/ios/.env` and set:
   - `EXPO_PUBLIC_SUPABASE_URL` = same Project URL.
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = same anon public key.
   - `EXPO_PUBLIC_API_URL` = your web API URL (e.g. `http://localhost:3000` for simulator).

---

## 6. (Optional) Dev-only mock users

If you want to test **without** Supabase (e.g. use the old mock users `shirley`, `yixiao`, `guest` via `X-User-Id` header):

1. In `packages/web/.env` add:
   ```bash
   ALLOW_MOCK_USERS=true
   ```
2. The API will then accept `X-User-Id` with those mock IDs when no valid Supabase JWT is present.  
   Leave this **off** or remove it in production.

---

## Summary checklist

- [ ] Supabase project created.
- [ ] Project URL and anon key copied.
- [ ] Email auth enabled (and optionally Google/GitHub).
- [ ] Site URL and redirect URLs set for web.
- [ ] `packages/web/.env` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] `packages/ios/.env` has `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_API_URL`.

After this, run the web app (`npm run dev` in `packages/web`) and the iOS app (`npm run ios` in `packages/ios`); you should be able to sign up and sign in with email/password.
