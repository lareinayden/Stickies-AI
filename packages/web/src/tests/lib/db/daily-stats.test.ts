/**
 * Unit tests for daily stats aggregation and effort score.
 *
 * These follow the TDD guidelines: define expected behavior for how
 * events are turned into daily_stats rows and how the effort score
 * caps tasks/reviews to avoid grindy behavior.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeDatabase, closeDbPool, getDbPool } from '@/lib/db/client';
import { createEvent } from '@/lib/db/events';
import {
  computeEffortScore,
  aggregateDailyStatsForUserOnDate,
  getDailyStatsForUserInRange,
} from '@/lib/db/daily-stats';

function startOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

describe('Daily Stats & Effort Score', () => {
  const userId = 'test-user-rewards';

  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await closeDbPool();
  });

  beforeEach(async () => {
    const db = getDbPool();
    await db.query('DELETE FROM events WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM daily_stats WHERE user_id = $1', [userId]);
  });

  it('computes effort score with caps on tasks and reviews', () => {
    const score = computeEffortScore({
      tasksCompleted: 10,
      reviewsCompleted: 30,
      streakMaintained: false,
    });

    // With weights w1=0.4, w2=0.4, w3=0.2
    // S = 0.4 * min(10, 5) + 0.4 * min(30, 20) + 0.2 * 0
    //   = 0.4 * 5 + 0.4 * 20
    //   = 2 + 8 = 10
    expect(score).toBeCloseTo(10);
  });

  it('aggregates events into a daily_stats row for a given date', async () => {
    const today = new Date();

    // 3 completed tasks
    await createEvent(userId, 'task_completed', { taskId: 't1' });
    await createEvent(userId, 'task_completed', { taskId: 't2' });
    await createEvent(userId, 'task_completed', { taskId: 't3' });

    // 5 sticky reviews
    await createEvent(userId, 'sticky_reviewed', { stickyId: 's1', status: 'learned' });
    await createEvent(userId, 'sticky_reviewed', { stickyId: 's2', status: 'needs_review' });
    await createEvent(userId, 'sticky_reviewed', { stickyId: 's3', status: 'learned' });
    await createEvent(userId, 'sticky_reviewed', { stickyId: 's4', status: 'learned' });
    await createEvent(userId, 'sticky_reviewed', { stickyId: 's5', status: 'needs_review' });

    const stats = await aggregateDailyStatsForUserOnDate(userId, today, {
      streakMaintained: false,
    });

    expect(stats.user_id).toBe(userId);
    expect(startOfUtcDay(stats.date).toISOString()).toBe(startOfUtcDay(today).toISOString());
    expect(stats.tasks_completed).toBe(3);
    expect(stats.reviews_completed).toBe(5);

    const expectedScore = computeEffortScore({
      tasksCompleted: 3,
      reviewsCompleted: 5,
      streakMaintained: false,
    });
    expect(stats.effort_score).toBeCloseTo(expectedScore);
  });
  it('retrieves daily stats for a user in a date range', async () => {
    const today = new Date();

    await createEvent(userId, 'task_completed', { taskId: 't1' });
    await aggregateDailyStatsForUserOnDate(userId, today, {
      streakMaintained: false,
    });

    const stats = await getDailyStatsForUserInRange(userId, today, today);
    expect(stats).toHaveLength(1);
    expect(startOfUtcDay(stats[0].date).toISOString()).toBe(
      startOfUtcDay(today).toISOString()
    );
    expect(stats[0].tasks_completed).toBe(1);
  });
});

