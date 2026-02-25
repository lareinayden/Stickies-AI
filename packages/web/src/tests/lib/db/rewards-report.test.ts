/**
 * Unit tests for rewards weekly report aggregation.
 *
 * These tests focus on summarizing daily_stats into a simple weekly
 * digest that the web/iOS UIs can render.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeDatabase, closeDbPool, getDbPool } from '@/lib/db/client';
import { getWeeklyReport } from '@/lib/db/rewards-report';

function makeDate(offsetDays: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

describe('Rewards Weekly Report', () => {
  const userId = 'test-user-weekly-report';

  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await closeDbPool();
  });

  beforeEach(async () => {
    const db = getDbPool();
    await db.query('DELETE FROM daily_stats WHERE user_id = $1', [userId]);
  });

  it('summarizes the last 7 days into a weekly report', async () => {
    const db = getDbPool();

    // Create some daily_stats rows across the last week.
    // Use dates -6, -4, -1 days relative to today.
    const d1 = makeDate(-6);
    const d2 = makeDate(-4);
    const d3 = makeDate(-1);

    await db.query(
      `
        INSERT INTO daily_stats (user_id, date, effort_score, tasks_completed, reviews_completed, streak_maintained)
        VALUES
          ($1, $2, 2.0, 1, 2, false),
          ($1, $3, 5.0, 3, 4, false),
          ($1, $4, 0.0, 0, 0, false)
      `,
      [
        userId,
        d1.toISOString().slice(0, 10),
        d2.toISOString().slice(0, 10),
        d3.toISOString().slice(0, 10),
      ]
    );

    const report = await getWeeklyReport(userId, new Date());

    expect(report.totalTasks).toBe(4); // 1 + 3
    expect(report.totalReviews).toBe(6); // 2 + 4
    expect(report.activeDays).toBe(2); // 2 days with non-zero effort
    expect(report.days).toBe(7);
    expect(report.bestDay).not.toBeNull();
    expect(report.bestDay?.effortScore).toBe(5.0);
  });
});

