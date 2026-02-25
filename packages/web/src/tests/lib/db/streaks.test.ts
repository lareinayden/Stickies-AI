/**
 * Unit tests for streak logic.
 *
 * NOTE: This implements a first-pass, no-grace streak behavior:
 * - Consecutive active days increment the streak.
 * - Any idle day breaks the streak, so the next active day restarts at 1.
 * Grace-day behavior can be layered on later by extending these tests.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeDatabase, closeDbPool, getDbPool } from '@/lib/db/client';
import {
  getOrCreateStreak,
  updateStreakForDate,
} from '@/lib/db/streaks';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

describe('Streaks', () => {
  const userId = 'test-user-streaks';

  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await closeDbPool();
  });

  beforeEach(async () => {
    const db = getDbPool();
    await db.query('DELETE FROM streaks WHERE user_id = $1', [userId]);
  });

  it('starts a new streak on the first active day', async () => {
    const today = new Date();

    const result = await updateStreakForDate(userId, today, {
      hasActivity: true,
    });

    expect(result.streakMaintained).toBe(true);

    const streak = await getOrCreateStreak(userId);
    expect(streak.current_streak).toBe(1);
    expect(streak.longest_streak).toBe(1);
  });

  it('increments streak on consecutive active days', async () => {
    const day1 = new Date('2024-01-01T00:00:00.000Z');
    const day2 = new Date('2024-01-02T00:00:00.000Z');

    await updateStreakForDate(userId, day1, { hasActivity: true });
    const result = await updateStreakForDate(userId, day2, {
      hasActivity: true,
    });

    expect(result.streakMaintained).toBe(true);
    expect(result.streak.current_streak).toBe(2);
    expect(result.streak.longest_streak).toBe(2);
  });

  it('breaks the streak after an idle day', async () => {
    const day1 = new Date();
    const day2 = addDays(day1, 1);
    const day3 = addDays(day1, 2);

    await updateStreakForDate(userId, day1, { hasActivity: true });
    await updateStreakForDate(userId, day2, { hasActivity: false });
    const result = await updateStreakForDate(userId, day3, {
      hasActivity: true,
    });

    expect(result.streakMaintained).toBe(true);

    const streak = await getOrCreateStreak(userId);
    // Streak should have restarted at 1 after the idle day
    expect(streak.current_streak).toBe(1);
    expect(streak.longest_streak).toBe(1);
  });
});

