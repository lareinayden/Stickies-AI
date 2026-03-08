import type { StreakRecord, UnlockRecord } from './schema';
import { ensureUnlock } from './unlocks';

/**
 * Check streak-based milestones and award unlocks if needed.
 * Awards:
 * - 7 days: seven_day_streak (Flame Keeper)
 * - 30 days: font (Sunbeam)
 * - 90 days: analytics (Blaze)
 * - 180 days: org_feature (Igniter)
 */
export async function checkStreakMilestones(
  userId: string,
  streak: StreakRecord
): Promise<UnlockRecord | null> {
  const { current_streak } = streak;
  let lastUnlock: UnlockRecord | null = null;

  if (current_streak >= 7) {
    lastUnlock = await ensureUnlock(userId, 'seven_day_streak', {
      milestone: 'seven_day_streak',
      currentStreak: current_streak,
    });
  }
  if (current_streak >= 30) {
    lastUnlock = await ensureUnlock(userId, 'font', {
      milestone: 'thirty_day_streak',
      currentStreak: current_streak,
    });
  }
  if (current_streak >= 90) {
    lastUnlock = await ensureUnlock(userId, 'analytics', {
      milestone: 'ninety_day_streak',
      currentStreak: current_streak,
    });
  }
  if (current_streak >= 180) {
    lastUnlock = await ensureUnlock(userId, 'org_feature', {
      milestone: 'one_eighty_day_streak',
      currentStreak: current_streak,
    });
  }

  return lastUnlock;
}

