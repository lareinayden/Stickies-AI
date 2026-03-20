/**
 * Seed deterministic Rewards demo data for a user:
 * - Heatmap: last 6 days show varied green levels
 * - Weekly recap: activeDays = 6 / 7 (we leave day -6 inactive)
 *
 * Usage (from packages/web):
 *   npx tsx src/scripts/simulate-rewards-demo.ts [userId]
 *
 * Example:
 *   npx tsx src/scripts/simulate-rewards-demo.ts shirley
 *
 * Requires: DB_* env and initialized schema (npm run db:init).
 */

import { getDbPool } from '@/lib/db/client';

function startOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addUtcDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function deleteExistingDemoEvents(userId: string, fromDay: Date, toDayInclusive: Date) {
  const db = getDbPool();
  const from = startOfUtcDay(fromDay);
  const toExclusive = addUtcDays(startOfUtcDay(toDayInclusive), 1);

  await db.query(
    `
      DELETE FROM events
      WHERE user_id = $1
        AND occurred_at >= $2
        AND occurred_at < $3
        AND event_type IN ('task_completed', 'sticky_reviewed')
    `,
    [userId, from, toExclusive]
  );
}

async function insertEventsForDay(userId: string, day: Date, tasks: number, reviews: number) {
  const db = getDbPool();
  const base = startOfUtcDay(day);

  // Insert tasks at 10:00, 10:01, ...
  for (let i = 0; i < tasks; i += 1) {
    const t = new Date(base);
    t.setUTCHours(10, i, 0, 0);
    // eslint-disable-next-line no-await-in-loop
    await db.query(
      `INSERT INTO events (user_id, event_type, occurred_at, metadata) VALUES ($1, $2, $3, $4)`,
      [userId, 'task_completed', t, null]
    );
  }

  // Insert reviews at 18:00, 18:01, ...
  for (let i = 0; i < reviews; i += 1) {
    const t = new Date(base);
    t.setUTCHours(18, i % 60, 0, 0);
    // eslint-disable-next-line no-await-in-loop
    await db.query(
      `INSERT INTO events (user_id, event_type, occurred_at, metadata) VALUES ($1, $2, $3, $4)`,
      [userId, 'sticky_reviewed', t, null]
    );
  }
}

async function main() {
  const userId = process.argv[2] ?? 'shirley';

  // Ensure we have DB (will throw if not configured)
  getDbPool();

  const today = startOfUtcDay(new Date());
  const weekStart = addUtcDays(today, -6); // weekly report window is today-6..today

  console.log(`Seeding Rewards demo data for user: ${userId}`);
  console.log(`Weekly window: ${weekStart.toISOString().slice(0, 10)} … ${today.toISOString().slice(0, 10)}`);
  console.log(`Active days target: 6 / 7 (leave ${weekStart.toISOString().slice(0, 10)} inactive)\n`);

  // Remove existing task/review events in the weekly window to keep the demo deterministic.
  await deleteExistingDemoEvents(userId, weekStart, today);

  // Seed last 6 days (today-5..today). Day today-6 remains inactive → activeDays=6.
  const plan = [
    { offset: -5, tasks: 1, reviews: 0 },  // effort 0.4 (light)
    { offset: -4, tasks: 2, reviews: 2 },  // effort 1.6 (light)
    { offset: -3, tasks: 3, reviews: 5 },  // effort 3.2 (medium)
    { offset: -2, tasks: 5, reviews: 10 }, // effort 6.0 (medium)
    { offset: -1, tasks: 5, reviews: 15 }, // effort 8.0 (dark)
    { offset: 0, tasks: 5, reviews: 20 },  // effort 10.0 (dark)
  ];

  for (const p of plan) {
    const day = addUtcDays(today, p.offset);
    // eslint-disable-next-line no-await-in-loop
    await insertEventsForDay(userId, day, p.tasks, p.reviews);
    console.log(
      `  ${day.toISOString().slice(0, 10)}: tasks=${p.tasks}, reviews=${p.reviews}`
    );
  }

  console.log('\nDone.');
  console.log('Open iOS → Rewards tab and pull-to-refresh to see heatmap + weekly recap.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

