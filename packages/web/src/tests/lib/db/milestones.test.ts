/**
 * End-to-end test for streak-based milestones and unlocks.
 *
 * When a user reaches a 7-day streak, they should receive a 'theme' unlock.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeDatabase, closeDbPool, getDbPool } from '@/lib/db/client';
import { updateStreakForDate } from '@/lib/db/streaks';
import { getUserUnlocks } from '@/lib/db/unlocks';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

describe('Streak Milestones', () => {
  const userId = 'test-user-milestones';

  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await closeDbPool();
  });

  beforeEach(async () => {
    const db = getDbPool();
    await db.query('DELETE FROM unlocks WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM streaks WHERE user_id = $1', [userId]);
  });

  it('awards a theme unlock when reaching a 7-day streak', async () => {
    const start = new Date('2024-01-01T00:00:00.000Z');

    for (let i = 0; i < 7; i += 1) {
      const day = addDays(start, i);
      const result = await updateStreakForDate(userId, day, {
        hasActivity: true,
      });
      expect(result.streakMaintained).toBe(true);
    }

    const unlocks = await getUserUnlocks(userId);
    expect(unlocks.length).toBeGreaterThanOrEqual(1);
    expect(unlocks.some((u) => u.unlock_type === 'theme')).toBe(true);
  });
});

