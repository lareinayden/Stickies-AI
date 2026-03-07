/**
 * Productivity pipeline tests (Definition of Done).
 *
 * 1. Peak Productivity Detection: DB correctly aggregates activity density by hour.
 * 2. Adaptive Push Timing: Evening vs Morning users get different delivery times in push log.
 * 3. Insight Visualization: Displayed insight matches raw DB stats.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeDatabase, closeDbPool, getDbPool } from '@/lib/db/client';
import {
  getActivityDensityByHour,
  getPeakProductivityWindow,
  getProductivityInsight,
} from '@/lib/db/productivity';
import { createEvent } from '@/lib/db/events';
import { logScheduledPush } from '@/lib/db/push-log';

const LOOKBACK = 14;

function dateAtUtcHour(daysAgo: number, hour: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, 30, 0, 0);
  return d;
}

describe('Productivity pipeline', () => {
  const eveningUserId = 'test-user-evening';
  const morningUserId = 'test-user-morning';

  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await closeDbPool();
  });

  beforeEach(async () => {
    const db = getDbPool();
    await db.query('DELETE FROM events WHERE user_id = $1 OR user_id = $2', [
      eveningUserId,
      morningUserId,
    ]);
    await db.query('DELETE FROM push_log WHERE user_id = $1 OR user_id = $2', [
      eveningUserId,
      morningUserId,
    ]);
  });

  it('aggregates activity density by hour for a test user', async () => {
    const userId = 'test-user-density';
    const db = getDbPool();
    await db.query('DELETE FROM events WHERE user_id = $1', [userId]);

    // 3 events at hour 14, 2 at hour 15 (same 2-hour window)
    for (let i = 0; i < 3; i++) {
      await createEvent(userId, 'task_completed', { taskId: `t-${i}` }, dateAtUtcHour(1, 14));
    }
    for (let i = 0; i < 2; i++) {
      await createEvent(userId, 'sticky_reviewed', { stickyId: `s-${i}`, status: 'learned' }, dateAtUtcHour(2, 15));
    }

    const density = await getActivityDensityByHour(userId, LOOKBACK);

    expect(density).toHaveLength(24);
    const hour14 = density.find((r) => r.hour === 14);
    const hour15 = density.find((r) => r.hour === 15);
    expect(hour14?.count).toBe(3);
    expect(hour15?.count).toBe(2);
    const otherHours = density.filter((r) => r.hour !== 14 && r.hour !== 15);
    expect(otherHours.every((r) => r.count === 0)).toBe(true);
  });

  it('identifies peak 2-hour window and suggests notification 30 min before', async () => {
    const userId = 'test-user-peak';
    const db = getDbPool();
    await db.query('DELETE FROM events WHERE user_id = $1', [userId]);

    // Peak at 18-19 (evening)
    for (let day = 0; day < 5; day++) {
      await createEvent(userId, 'task_completed', { taskId: `t-${day}` }, dateAtUtcHour(day, 18));
      await createEvent(userId, 'task_completed', { taskId: `t2-${day}` }, dateAtUtcHour(day, 19));
    }
    // Some activity at 10-11 (morning) but less
    for (let day = 0; day < 2; day++) {
      await createEvent(userId, 'task_completed', { taskId: `m-${day}` }, dateAtUtcHour(day, 10));
    }

    const peak = await getPeakProductivityWindow(userId, LOOKBACK);

    expect(peak).not.toBeNull();
    expect(peak!.startHour).toBe(18);
    expect(peak!.endHour).toBe(19);
    expect(peak!.activityCount).toBe(10);
    expect(peak!.notificationHour).toBe(17);
    expect(peak!.notificationMinute).toBe(30);
  });

  it('evening user and morning user get different push delivery times in push_log', async () => {
    const db = getDbPool();

    // Evening user: activity at 18-19 UTC so peak window 18-19 wins (not tie with 17-18)
    for (let day = 0; day < LOOKBACK; day++) {
      await createEvent(eveningUserId, 'task_completed', { taskId: `e-${day}` }, dateAtUtcHour(day, 18));
      await createEvent(eveningUserId, 'task_completed', { taskId: `e2-${day}` }, dateAtUtcHour(day, 19));
    }
    // Morning user: activity at 8-9 UTC so peak window 8-9 wins
    for (let day = 0; day < LOOKBACK; day++) {
      await createEvent(morningUserId, 'task_completed', { taskId: `m-${day}` }, dateAtUtcHour(day, 8));
      await createEvent(morningUserId, 'task_completed', { taskId: `m2-${day}` }, dateAtUtcHour(day, 9));
    }

    const eveningPeak = await getPeakProductivityWindow(eveningUserId, LOOKBACK);
    const morningPeak = await getPeakProductivityWindow(morningUserId, LOOKBACK);

    expect(eveningPeak).not.toBeNull();
    expect(morningPeak).not.toBeNull();
    expect(eveningPeak!.startHour).toBe(18);
    expect(morningPeak!.startHour).toBe(8);

    // Schedule push: 30 min before peak -> evening 17:30, morning 7:30
    const now = new Date();
    const eveningScheduled = new Date(now);
    eveningScheduled.setUTCHours(eveningPeak!.notificationHour, eveningPeak!.notificationMinute, 0, 0);
    const morningScheduled = new Date(now);
    morningScheduled.setUTCHours(morningPeak!.notificationHour, morningPeak!.notificationMinute, 0, 0);

    await logScheduledPush(eveningUserId, eveningScheduled, eveningPeak!.startHour, {
      title: 'Time to focus',
    });
    await logScheduledPush(morningUserId, morningScheduled, morningPeak!.startHour, {
      title: 'Time to focus',
    });

    const eveningLogs = await db.query(
      'SELECT scheduled_for, peak_start_hour FROM push_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [eveningUserId]
    );
    const morningLogs = await db.query(
      'SELECT scheduled_for, peak_start_hour FROM push_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [morningUserId]
    );

    expect(eveningLogs.rows).toHaveLength(1);
    expect(morningLogs.rows).toHaveLength(1);

    const eveningHour = (eveningLogs.rows[0].scheduled_for as Date).getUTCHours();
    const morningHour = (morningLogs.rows[0].scheduled_for as Date).getUTCHours();

    expect(eveningHour).toBe(17);
    expect(morningHour).toBe(7);
    expect(eveningLogs.rows[0].peak_start_hour).toBe(18);
    expect(morningLogs.rows[0].peak_start_hour).toBe(8);
  });

  it('insight string is derived from raw DB stats and can be cross-referenced', async () => {
    const userId = 'test-user-insight';
    const db = getDbPool();
    await db.query('DELETE FROM events WHERE user_id = $1', [userId]);

    // All activity in evening (18-19): 10 events
    for (let day = 0; day < 5; day++) {
      await createEvent(userId, 'task_completed', { taskId: `a-${day}` }, dateAtUtcHour(day, 18));
      await createEvent(userId, 'task_completed', { taskId: `b-${day}` }, dateAtUtcHour(day, 19));
    }

    const density = await getActivityDensityByHour(userId, LOOKBACK);
    const totalActivity = density.reduce((s, r) => s + r.count, 0);
    const { insight, peakLabel, peakActivityCount, totalActivity: totalFromInsight } =
      await getProductivityInsight(userId, LOOKBACK);

    expect(totalActivity).toBe(10);
    expect(totalFromInsight).toBe(10);
    expect(peakLabel).toContain('Evening');
    expect(peakActivityCount).toBe(10);
    expect(insight).toMatch(/evening|Evening/i);
    expect(insight).toMatch(/%|more active|most active/);
  });
});
