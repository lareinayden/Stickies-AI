# Testing the Productivity Pipeline & Smart Notifications

## 1. Unit tests (backend)

These tests require a running Postgres and the web package’s `.env` (see [DATABASE_SETUP.md](./DATABASE_SETUP.md)).

```bash
cd packages/web
npm run db:init   # if you haven’t already (creates tables including push_log)
npm run test -- --run src/tests/lib/db/productivity.test.ts
```

**What they cover:**

- **Peak productivity detection** – Inserts events at specific hours and checks that `getActivityDensityByHour` returns correct counts and that `getPeakProductivityWindow` returns the right 2-hour window and notification time (30 min before).
- **Adaptive push timing** – Builds an “evening” user (activity at 18–19 UTC) and a “morning” user (activity at 8–9 UTC), logs scheduled pushes, and asserts `push_log` has different `scheduled_for` hours (17 vs 7).
- **Insight accuracy** – Inserts 10 events in evening hours and checks that the insight string and returned stats (total activity, peak label) match the data.

If Postgres isn’t running or the env is wrong, tests will fail with a connection error; fix DB/env and re-run.

---

## 2. API (manual)

With the web app running and a user id you use in the app (e.g. from login):

```bash
# Replace YOUR_USER_ID with the value you use (e.g. shirley, yixiao, guest)
curl -s -H "X-User-Id: YOUR_USER_ID" http://localhost:3000/api/rewards/productivity | jq
```

You should get:

- `peakWindow` – `startHour`, `endHour`, `label` (e.g. "Evening Reviewer"), `notificationHour`, `notificationMinute`.
- `insight` – e.g. "You're 20% more active during evening sessions."
- `activityByHour` – array of `{ hour, count }` for verification.

If the user has no events in the last 14 days, `peakWindow` will be `null` and `insight` will be the fallback message about completing more tasks/reviews.

---

## 3. In the iOS app (end-to-end)

1. **Start backend and app**
   - From `packages/web`: `npm run dev`
   - From `packages/ios`: ensure `.env` has `EXPO_PUBLIC_API_URL=http://localhost:3000` (simulator) or your machine’s IP (physical device).
   - Run the app: `cd packages/ios && npm start`, then press `i` for iOS Simulator (or scan QR with Expo Go).

2. **Log in**
   - Pick a user (e.g. Shirley, Yixiao, Guest). This user id is sent as `X-User-Id` to the API; the backend uses it for events and productivity.

3. **Create activity (so the insight has data)**
   - **Tasks tab:** Open a task and mark it **complete** (checkbox). Each completion sends a `task_completed` event with `occurred_at` = completion time.
   - **Learning tab:** Open a learning area, tap a sticky, and mark it **Learned**. Each sends a `sticky_reviewed` event.
   - Do this several times over a few days (or use the API/DB to backfill events) so the last 14 days have a clear “peak” hour.

4. **View the insight**
   - Open the **Rewards** tab.
   - If there’s enough activity in the last 14 days, the **“Your insight”** card appears at the top with a line like: *“You're X% more active during evening sessions.”* or *“Your most active window is the evening.”*
   - If you see no insight card or the fallback (“Complete more tasks and reviews…”), there aren’t enough events yet — complete more tasks or mark more stickies learned, then pull-to-refresh on Rewards.

5. **Optional: check the API**
   - From your machine:  
     `curl -s -H "X-User-Id: YOUR_USER_ID" http://localhost:3000/api/rewards/productivity | jq`  
   - Use the same user name you picked in the app (e.g. `shirley`). The `insight` and `activityByHour` in the response should match what the app shows after refresh.

---

## 4. Quick DB sanity check

If you have `psql` and want to confirm events and density:

```bash
cd packages/web
# Ensure .env has DB_* set, then:
psql $DATABASE_URL -c "
  SELECT EXTRACT(HOUR FROM occurred_at)::int AS hour, COUNT(*)
  FROM events
  WHERE user_id = 'YOUR_USER_ID'
    AND occurred_at >= NOW() - INTERVAL '14 days'
    AND event_type IN ('task_completed', 'sticky_reviewed')
  GROUP BY 1
  ORDER BY 1;
"
```

Replace `YOUR_USER_ID` and `$DATABASE_URL` (or use `stickies_ai` and your .env credentials). This mirrors what `getActivityDensityByHour` uses.

---

## Summary

| Goal | How |
|------|-----|
| Verify aggregation & peak & push timing logic | Run `npm run test -- --run src/tests/lib/db/productivity.test.ts` in `packages/web` (with DB) |
| See API response for a user | `curl -H "X-User-Id: <userId>" http://localhost:3000/api/rewards/productivity` |
| See insight in the app | Use app, complete tasks / mark stickies learned, open Rewards tab |
| Inspect raw event counts by hour | `psql` query above (or use `activityByHour` from the API) |
