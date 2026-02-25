import type { StreakRecord, UnlockRecord } from './schema';
import { ensureUnlock } from './unlocks';

/**
 * Check streak-based milestones and award unlocks if needed.
 * For now:
 * - When current_streak >= 7, award a 'theme' unlock once.
 */
export async function checkStreakMilestones(
  userId: string,
  streak: StreakRecord
): Promise<UnlockRecord | null> {
  if (streak.current_streak < 7) {
    return null;
  }

  // Award a theme unlock when the user hits a 7-day streak.
  const unlock = await ensureUnlock(userId, 'theme', {
    milestone: 'seven_day_streak',
    currentStreak: streak.current_streak,
  });

  return unlock;
}

