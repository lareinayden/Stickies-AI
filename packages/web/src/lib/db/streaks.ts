import { getDbPool } from './client';
import type { StreakRecord } from './schema';
import { checkStreakMilestones } from './milestones';

export interface StreakUpdateResult {
  streakMaintained: boolean;
  streak: StreakRecord;
}

function startOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const utcA = startOfUtcDay(a).getTime();
  const utcB = startOfUtcDay(b).getTime();
  return Math.round((utcB - utcA) / msPerDay);
}

export async function getOrCreateStreak(userId: string): Promise<StreakRecord> {
  const db = getDbPool();
  const existing = await db.query(
    'SELECT * FROM streaks WHERE user_id = $1',
    [userId]
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0] as any;
    return {
      id: row.id,
      user_id: row.user_id,
      current_streak: row.current_streak,
      longest_streak: row.longest_streak,
      grace_used: row.grace_used,
      grace_period_start: row.grace_period_start ?? null,
      last_active_date: row.last_active_date ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  const inserted = await db.query(
    `
      INSERT INTO streaks (user_id, current_streak, longest_streak)
      VALUES ($1, 0, 0)
      RETURNING *
    `,
    [userId]
  );

  const row = inserted.rows[0] as any;
  return {
    id: row.id,
    user_id: row.user_id,
    current_streak: row.current_streak,
    longest_streak: row.longest_streak,
    grace_used: row.grace_used,
    grace_period_start: row.grace_period_start ?? null,
    last_active_date: row.last_active_date ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Update a user's streak for a specific date, given whether they had
 * any activity (tasks or reviews). This initial version does NOT
 * implement grace days yet: any idle day breaks the streak.
 */
export async function updateStreakForDate(
  userId: string,
  date: Date,
  options: { hasActivity: boolean }
): Promise<StreakUpdateResult> {
  const db = getDbPool();
  const current = await getOrCreateStreak(userId);

  const hasActivity = options.hasActivity;
  let currentStreak = current.current_streak;
  let longestStreak = current.longest_streak;
  let lastActiveDate: Date | null = null;
  if (current.last_active_date) {
    if (typeof current.last_active_date === 'string') {
      // Postgres DATE comes back as 'YYYY-MM-DD' in local time; normalize to UTC midnight.
      lastActiveDate = new Date(`${current.last_active_date}T00:00:00.000Z`);
    } else {
      lastActiveDate = startOfUtcDay(current.last_active_date as Date);
    }
  }

  if (!hasActivity) {
    // Idle day: streak is not maintained; we do not change streak counts
    // here, but the next active day will restart from 1.
    return {
      streakMaintained: false,
      streak: current,
    };
  }

  const today = startOfUtcDay(date);

  if (!lastActiveDate) {
    if (currentStreak > 0) {
      // Fallback: if we have a non-zero streak but no recorded last_active_date,
      // assume the last activity was on the previous day so consecutive
      // calls on different dates still increment correctly.
      lastActiveDate = new Date(today);
      lastActiveDate.setUTCDate(lastActiveDate.getUTCDate() - 1);
    } else {
      currentStreak = 1;
      lastActiveDate = today;
    }
  }

  if (lastActiveDate) {
    const diff = daysBetween(lastActiveDate, today);
    if (diff === 0) {
      // Multiple activity records on the same day do not change streak length
    } else if (diff === 1) {
      currentStreak += 1;
      lastActiveDate = today;
    } else {
      // One or more idle days between lastActiveDate and today break the streak
      currentStreak = 1;
      lastActiveDate = today;
    }
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  const dayStr = today.toISOString().slice(0, 10);

  const updated = await db.query(
    `
      UPDATE streaks
      SET current_streak = $1,
          longest_streak = $2,
          last_active_date = $3,
          updated_at = NOW()
      WHERE user_id = $4
      RETURNING *
    `,
    [currentStreak, longestStreak, dayStr, userId]
  );

  const row = updated.rows[0] as any;
  const streak: StreakRecord = {
    id: row.id,
    user_id: row.user_id,
    current_streak: row.current_streak,
    longest_streak: row.longest_streak,
    grace_used: row.grace_used,
    grace_period_start: row.grace_period_start ?? null,
    last_active_date: row.last_active_date ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  await checkStreakMilestones(userId, streak);

  return {
    streakMaintained: true,
    streak,
  };
}

