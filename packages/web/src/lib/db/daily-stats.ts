import { getDbPool } from './client';
import type { DailyStatsRecord } from './schema';

export interface EffortInputs {
  tasksCompleted: number;
  reviewsCompleted: number;
  streakMaintained: boolean;
}

// Weights for the effort score components
export const EFFORT_WEIGHTS = {
  tasks: 0.4,
  reviews: 0.4,
  streak: 0.2,
} as const;

function startOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function nextUtcDay(date: Date): Date {
  const d = startOfUtcDay(date);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

export function computeEffortScore(inputs: EffortInputs): number {
  const cappedTasks = Math.min(inputs.tasksCompleted, 5);
  const cappedReviews = Math.min(inputs.reviewsCompleted, 20);
  const streakIndicator = inputs.streakMaintained ? 1 : 0;

  return (
    EFFORT_WEIGHTS.tasks * cappedTasks +
    EFFORT_WEIGHTS.reviews * cappedReviews +
    EFFORT_WEIGHTS.streak * streakIndicator
  );
}

/**
 * Aggregate events into a daily_stats row for a specific user and date.
 * Streak handling is provided as an input flag; the streak engine can call
 * this helper after determining whether the streak was maintained.
 */
export async function aggregateDailyStatsForUserOnDate(
  userId: string,
  date: Date,
  options: { streakMaintained: boolean }
): Promise<DailyStatsRecord> {
  const db = getDbPool();
  const dayStart = startOfUtcDay(date);
  const dayEnd = nextUtcDay(date);

  const eventsResult = await db.query<{
    tasks_completed: number;
    reviews_completed: number;
  }>(
    `
      SELECT
        SUM(CASE WHEN event_type = 'task_completed' THEN 1 ELSE 0 END)::int AS tasks_completed,
        SUM(CASE WHEN event_type = 'sticky_reviewed' THEN 1 ELSE 0 END)::int AS reviews_completed
      FROM events
      WHERE user_id = $1
        AND occurred_at >= $2
        AND occurred_at < $3
    `,
    [userId, dayStart, dayEnd]
  );

  const row = eventsResult.rows[0] ?? {
    tasks_completed: 0,
    reviews_completed: 0,
  };

  const tasksCompleted = row.tasks_completed ?? 0;
  const reviewsCompleted = row.reviews_completed ?? 0;

  const effortScore = computeEffortScore({
    tasksCompleted,
    reviewsCompleted,
    streakMaintained: options.streakMaintained,
  });

  const upsertResult = await db.query(
    `
      INSERT INTO daily_stats (
        user_id,
        date,
        effort_score,
        tasks_completed,
        reviews_completed,
        streak_maintained
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, date)
      DO UPDATE SET
        effort_score = EXCLUDED.effort_score,
        tasks_completed = EXCLUDED.tasks_completed,
        reviews_completed = EXCLUDED.reviews_completed,
        streak_maintained = EXCLUDED.streak_maintained
      RETURNING *
    `,
    [
      userId,
      dayStart.toISOString().slice(0, 10), // DATE only
      effortScore,
      tasksCompleted,
      reviewsCompleted,
      options.streakMaintained,
    ]
  );

  const statsRow = upsertResult.rows[0] as unknown as {
    id: string;
    user_id: string;
    date: Date;
    effort_score: number;
    tasks_completed: number;
    reviews_completed: number;
    streak_maintained: boolean;
    created_at: Date;
  };

  return {
    id: statsRow.id,
    user_id: statsRow.user_id,
    date: statsRow.date,
    effort_score: statsRow.effort_score,
    tasks_completed: statsRow.tasks_completed,
    reviews_completed: statsRow.reviews_completed,
    streak_maintained: statsRow.streak_maintained,
    created_at: statsRow.created_at,
  };
}

/**
 * Fetch daily_stats rows for a user between two dates (inclusive),
 * ordered by date ascending.
 */
export async function getDailyStatsForUserInRange(
  userId: string,
  from: Date,
  to: Date
): Promise<DailyStatsRecord[]> {
  const db = getDbPool();
  const start = startOfUtcDay(from);
  const endExclusive = nextUtcDay(to);

  const result = await db.query(
    `
      SELECT *
      FROM daily_stats
      WHERE user_id = $1
        AND date >= $2
        AND date < $3
      ORDER BY date ASC
    `,
    [userId, start.toISOString().slice(0, 10), endExclusive.toISOString().slice(0, 10)]
  );

  return result.rows.map((row) => ({
    id: row.id as string,
    user_id: row.user_id as string,
    date: row.date as Date,
    effort_score: Number(row.effort_score),
    tasks_completed: Number(row.tasks_completed),
    reviews_completed: Number(row.reviews_completed),
    streak_maintained: Boolean(row.streak_maintained),
    created_at: row.created_at as Date,
  }));
}


