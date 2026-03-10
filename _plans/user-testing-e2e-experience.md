# Polished End-to-End Experience for User Testing

## Overview

This plan defines **one clear, polished journey** for running user tests on Stickies AI. The primary surface is the **iOS app** (Expo), with the **web backend** required to be running. The flow is designed so testers experience: sign up → onboarding → capture (voice or text) → AI extraction → tasks/learning → completion → rewards, in a single coherent session.

---

## Goals

- **One primary E2E path** that showcases voice/text capture, AI extraction, tasks, learning stickies, and rewards.
- **Minimal setup** for testers: backend running, Supabase configured, iOS app on simulator or device.
- **Clear facilitator script** so anyone can run a 15–20 minute test session and collect structured feedback.
- **Polish checklist** so the experience feels complete (loading states, errors, empty states, success feedback).

---

## The Polished E2E Journey

**Name:** *Capture → Extract → Act → See Progress*

| Step | Screen / Action | What the user sees / does |
|------|------------------|---------------------------|
| 1 | **Login** | Sign up or sign in (email + password). Supabase auth. |
| 2 | **Onboarding tour** | Modal steps: Home → Add note (+ button) → Tasks → Learning → Rewards → Account. Option to Skip or go through all. |
| 3 | **Home** | Empty feed or existing tasks/learning cards. “Create your first task! Tap + to get started.” if no task yet. |
| 4 | **Add note** (tap +) | Segmented control: **Voice** or **Type**. Voice: record → upload → transcript appears. Type: type a short note (e.g. “Buy milk tomorrow at 10am. I want to learn React hooks.”). |
| 5 | **Choose action** | After content is captured: “What should we do with this note?” → **Extract Tasks** or **Turn Into Learning Topic**. |
| 6a | **Tasks tab** (if Extract Tasks) | New task(s) appear (Today / Upcoming / Past). Tap checkbox to complete. |
| 6b | **Learning tab** (if Learning Topic) | New learning area with flip cards. Tap card to flip, mark **Learned** or **Needs review**. |
| 7 | **Rewards tab** | Effort heatmap (30 days), weekly recap, highlights, badges. Pull to refresh. After completing tasks/reviews, data updates. |
| 8 | **Account** | “Show guide again”, “Log out”. |

---

## Prerequisites (Facilitator / Environment)

Before inviting testers, ensure:

1. **Web backend**
   - From repo root: `cd packages/web && npm run dev` (and DB + FFmpeg + `.env` with Supabase + OpenAI).

2. **Database**
   - Postgres running; `npm run db:init` executed so `events`, `daily_stats`, `streaks`, `unlocks` exist (rewards work).

3. **iOS app**
   - `packages/ios`: `.env` has `EXPO_PUBLIC_API_URL` (simulator: `http://localhost:3000`; device: LAN IP) and Supabase `EXPO_PUBLIC_SUPABASE_*`.
   - Run: `npm start` then press `i` for iOS simulator (or scan QR for device).

4. **Supabase**
   - Same project for web and iOS; email confirmations can be disabled in Supabase Auth settings for easier testing.

---

## User Testing Script (Facilitator)

**Duration:** ~15–20 minutes per tester.

### Intro (1 min)

- “We’re testing an app that turns voice or text notes into tasks and learning cards, and tracks your progress. There are no wrong answers; we care about what feels clear or confusing.”

### Task 1 – Sign up and first look (2–3 min)

- “Please sign up with your email and a password.”
- Observe: sign up flow, any errors, then redirect to app.
- “You’ll see a short guide. You can skip or go through it.”
- Observe: whether they skip or complete; if they understand what the + button does.

### Task 2 – Capture and extract tasks (4–5 min)

- “Add a note: either say something out loud (e.g. ‘Call mom tomorrow and review my Spanish vocabulary’) or type it. Then choose ‘Extract Tasks’.”
- Observe: voice vs type choice; recording/upload/transcript clarity; whether they find “Extract Tasks”; whether they end up on Tasks tab and see the new task(s).

### Task 3 – Complete a task and check Rewards (3–4 min)

- “Open the Tasks tab, find the task you just created, and mark it complete.”
- “Then open the Rewards tab and pull to refresh.”
- Observe: do they find the checkbox; do they see heatmap/weekly recap update (may need a few events for visible change).

### Task 4 – Learning path (optional, 3–4 min)

- “Tap + again. Type or say something like ‘I want to learn React hooks’ and choose ‘Turn Into Learning Topic’.”
- “Open Learning, flip a card, and mark it Learned or Needs review.”
- Observe: clarity of learning flow; whether they discover flip and status buttons.

### Wrap-up (2 min)

- “What was the most confusing part?” “What would you expect to happen next after adding a note?” “Would you use this to capture tasks or to learn things?”

---

## Polish Checklist (Pre–User Test)

Use this to ensure the experience feels complete:

- [ ] **Login**: Error messages for invalid email/password and “Supabase not configured” are clear.
- [ ] **Onboarding**: Tour appears for new users (no `stickies_onboarding_done_<userId>` in AsyncStorage). “Show guide again” from Account works.
- [ ] **Add note**: Voice – recording, upload, and transcript steps have clear feedback (and error message if Whisper/network fails). Type – placeholder and “Captured note” preview are visible.
- [ ] **Extract / Learning**: Loading indicators on buttons during API calls. On success, navigate to Tasks or Learning and new items appear (feed/tab refresh).
- [ ] **Tasks**: Empty states for Today/Upcoming/Past are friendly. Completing a task calls PATCH with `completed: true`; backend records `task_completed` so Rewards updates.
- [ ] **Learning**: Flip works; “Learned” / “Needs review” persist and emit `sticky_reviewed` for Rewards.
- [ ] **Rewards**: Empty state: “No activity yet. Complete tasks or review learning stickies…” Pull-to-refresh reloads heatmap, weekly recap, highlights, badges.
- [ ] **Account**: “Show guide again” and “Log out” work; after logout, redirect to login.

---

## Known Limitations (Set Tester Expectations)

- **Voice**: Requires microphone permission; backend needs OpenAI key and FFmpeg. Simulator can use type-only if voice is problematic.
- **Rewards**: Heatmap and streaks need at least some `task_completed` or `sticky_reviewed` events; first session may show mostly empty state.
- **Auth**: Supabase only; no social login in this flow. Email confirmation can be turned off in Supabase for faster testing.

---

## Success Criteria for the E2E Experience

- Tester can **sign up**, **see onboarding**, **add a note** (voice or type), **choose Extract Tasks or Learning**, **see results** in the right tab, **complete a task** or **review a sticky**, and **see Rewards** update (or see a clear empty state).
- No dead ends: every path has a clear next step or error message.
- Facilitator can run the script without debugging; only environment setup (backend + DB + Supabase + iOS .env) is required.

---

## Files Reference

| Area | Location |
|------|-----------|
| Login | `packages/ios/app/login.tsx` |
| Onboarding | `packages/ios/src/contexts/OnboardingContext.tsx`, `packages/ios/src/components/OnboardingTour.tsx` |
| Home feed | `packages/ios/app/(tabs)/index.tsx` |
| Add note | `packages/ios/app/add-note.tsx` |
| Tasks | `packages/ios/app/(tabs)/tasks.tsx` |
| Learning | `packages/ios/app/(tabs)/learning-stickies.tsx` |
| Rewards | `packages/ios/app/(tabs)/rewards.tsx` |
| Account | `packages/ios/app/(tabs)/account.tsx` |
| API (tasks, events, rewards) | `packages/web/src/app/api/` |
| Rewards logic | `_plans/rewards-reinforcement-implementation.md` |

---

## Optional: Short Tester Handout

You can give testers a single paragraph:

> **Stickies AI** turns voice or text into tasks and learning cards. After sign-up you’ll see a short guide. Use the **+** button to add a note (speak or type), then choose **Extract Tasks** or **Turn Into Learning Topic**. Tasks appear under Tasks; learning cards under Learning. Complete tasks or mark cards Learned to see your **Rewards** (heatmap and badges) update. You can **Show guide again** from Account.

This supports the polished E2E experience and keeps the session focused for user testing.
