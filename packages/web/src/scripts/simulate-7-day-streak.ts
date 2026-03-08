/**
 * Simulate a 7-day streak for a user.
 *
 * Usage (from packages/web):
 *   npx tsx src/scripts/simulate-7-day-streak.ts [userId]
 *
 * Example:
 *   npx tsx src/scripts/simulate-7-day-streak.ts shirley
 *
 * This calls updateStreakForDate for 7 consecutive UTC days (today-6 through today)
 * with hasActivity: true. On the 7th day, checkStreakMilestones awards the 'seven_day_streak' badge.
 *
 * Requires: DB_* env and initialized schema (npm run db:init).
 */

import { getDbPool } from '@/lib/db/client';
import { updateStreakForDate } from '@/lib/db/streaks';
import { getUserUnlocks } from '@/lib/db/unlocks';

function startOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main() {
  const userId = process.argv[2] ?? 'shirley';

  // Ensure we have DB (will throw if not configured)
  getDbPool();

  const today = startOfUtcDay(new Date());

  console.log(`Simulating 7-day streak for user: ${userId}`);
  console.log(`Dates: ${addDays(today, -6).toISOString().slice(0, 10)} … ${today.toISOString().slice(0, 10)}\n`);

  for (let i = 0; i < 7; i++) {
    const day = addDays(today, -6 + i);
    const result = await updateStreakForDate(userId, day, { hasActivity: true });
    console.log(
      `  Day ${i + 1}: ${day.toISOString().slice(0, 10)} → streak ${result.streak.current_streak}`
    );
  }

  const unlocks = await getUserUnlocks(userId);
  const badge = unlocks.find((u) => u.unlock_type === 'seven_day_streak');
  if (badge) {
    console.log(`\n✓ 7 Day Streak badge awarded (earned_at: ${badge.earned_at.toISOString().slice(0, 10)})`);
  } else {
    console.log('\n⚠ No seven_day_streak badge found; check milestones and unlocks tables.');
  }

  console.log('\nDone. Open the Rewards tab → Badges (as this user) to see the badge.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
