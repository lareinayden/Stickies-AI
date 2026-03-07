/**
 * Productivity pattern detection from events.occurred_at (last 14 days).
 * - Aggregates activity density by hour (UTC).
 * - Identifies peak 2-hour window and labels it (e.g. "Evening Reviewer").
 * - Builds a personalized insight string for the Rewards tab.
 */

import { getDbPool } from './client';

const PEAK_WINDOW_HOURS = 2;
const DEFAULT_LOOKBACK_DAYS = 14;

/** Activity count per hour (0–23) for the last N days */
export interface ActivityDensityRow {
  hour: number;
  count: number;
}

/** Peak 2-hour window and label for adaptive notifications */
export interface PeakProductivityWindow {
  startHour: number;
  endHour: number;
  label: string;
  activityCount: number;
  /** Suggested notification time: 30 minutes before peak start */
  notificationHour: number;
  notificationMinute: number;
}

/** Full productivity profile returned to client */
export interface ProductivityProfile {
  peakWindow: PeakProductivityWindow | null;
  /** Personalized insight string (e.g. "You're 20% more active during evening sessions") */
  insight: string;
  /** Raw density by hour for verification/testing */
  activityByHour: ActivityDensityRow[];
}

const HOUR_LABELS: Record<number, string> = {
  0: 'Night',
  1: 'Night',
  2: 'Night',
  3: 'Night',
  4: 'Night',
  5: 'Night',
  6: 'Morning',
  7: 'Morning',
  8: 'Morning',
  9: 'Morning',
  10: 'Morning',
  11: 'Morning',
  12: 'Afternoon',
  13: 'Afternoon',
  14: 'Afternoon',
  15: 'Afternoon',
  16: 'Afternoon',
  17: 'Afternoon',
  18: 'Evening',
  19: 'Evening',
  20: 'Evening',
  21: 'Evening',
  22: 'Evening',
  23: 'Evening',
};

function labelForHour(hour: number): string {
  return HOUR_LABELS[hour] ?? 'Unknown';
}

/**
 * Aggregates activity (task_completed + sticky_reviewed) by hour (UTC) for the last N days.
 * Used to verify DB aggregation and to compute peak window.
 */
export async function getActivityDensityByHour(
  userId: string,
  lastNDays: number = DEFAULT_LOOKBACK_DAYS
): Promise<ActivityDensityRow[]> {
  const db = getDbPool();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - lastNDays);
  since.setUTCHours(0, 0, 0, 0);

  const result = await db.query<{ hour: number; count: string }>(
    `
    SELECT
      EXTRACT(HOUR FROM (occurred_at AT TIME ZONE 'UTC'))::int AS hour,
      COUNT(*)::text AS count
    FROM events
    WHERE user_id = $1
      AND occurred_at >= $2
      AND event_type IN ('task_completed', 'sticky_reviewed')
    GROUP BY EXTRACT(HOUR FROM (occurred_at AT TIME ZONE 'UTC'))
    ORDER BY hour
    `,
    [userId, since]
  );

  const byHour = new Map<number, number>();
  for (let h = 0; h < 24; h++) {
    byHour.set(h, 0);
  }
  for (const row of result.rows) {
    byHour.set(row.hour, parseInt(row.count, 10) || 0);
  }

  return Array.from(byHour.entries()).map(([hour, count]) => ({ hour, count }));
}

/**
 * Finds the 2-hour sliding window with the highest activity count.
 * Returns label from the start hour (e.g. "Evening Reviewer" when start is 18).
 */
export async function getPeakProductivityWindow(
  userId: string,
  lastNDays: number = DEFAULT_LOOKBACK_DAYS
): Promise<PeakProductivityWindow | null> {
  const density = await getActivityDensityByHour(userId, lastNDays);
  const counts = density.map((d) => d.count);
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  let bestStart = 0;
  let bestSum = 0;
  for (let start = 0; start <= 24 - PEAK_WINDOW_HOURS; start++) {
    const end = start + PEAK_WINDOW_HOURS;
    let sum = 0;
    for (let h = start; h < end; h++) {
      sum += density[h]?.count ?? 0;
    }
    if (sum > bestSum) {
      bestSum = sum;
      bestStart = start;
    }
  }
  const endHour = bestStart + PEAK_WINDOW_HOURS - 1;

  const label = labelForHour(bestStart);
  const notificationHour = bestStart === 0 ? 23 : bestStart - 1;
  const notificationMinute = 30;

  return {
    startHour: bestStart,
    endHour,
    label: `${label} Reviewer`,
    activityCount: bestSum,
    notificationHour,
    notificationMinute,
  };
}

/**
 * Builds a personalized insight string from activity stats.
 * Cross-referenced with DB so UI can be verified for accuracy.
 */
export async function getProductivityInsight(
  userId: string,
  lastNDays: number = DEFAULT_LOOKBACK_DAYS
): Promise<{ insight: string; peakLabel: string | null; peakActivityCount: number; totalActivity: number }> {
  const density = await getActivityDensityByHour(userId, lastNDays);
  const totalActivity = density.reduce((a, d) => a + d.count, 0);
  const peak = await getPeakProductivityWindow(userId, lastNDays);

  if (!peak || totalActivity === 0) {
    return {
      insight: 'Complete more tasks and reviews to unlock your productivity insight.',
      peakLabel: null,
      peakActivityCount: 0,
      totalActivity,
    };
  }

  const avgPerTwoHours = totalActivity / 12;
  const pctMore =
    avgPerTwoHours > 0
      ? Math.round(((peak.activityCount - avgPerTwoHours) / avgPerTwoHours) * 100)
      : 0;
  const sessionLabel = peak.label.replace(' Reviewer', '').toLowerCase();

  const insight =
    pctMore > 0
      ? `You're ${pctMore}% more active during ${sessionLabel} sessions.`
      : `Your most active window is the ${sessionLabel}.`;

  return {
    insight,
    peakLabel: peak.label,
    peakActivityCount: peak.activityCount,
    totalActivity,
  };
}

/**
 * Full productivity profile for the Rewards tab and notification scheduling.
 */
export async function getProductivityProfile(
  userId: string,
  lastNDays: number = DEFAULT_LOOKBACK_DAYS
): Promise<ProductivityProfile> {
  const peakWindow = await getPeakProductivityWindow(userId, lastNDays);
  const { insight } = await getProductivityInsight(userId, lastNDays);
  const activityByHour = await getActivityDensityByHour(userId, lastNDays);

  return {
    peakWindow,
    insight,
    activityByHour,
  };
}
