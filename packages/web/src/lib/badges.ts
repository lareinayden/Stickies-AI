/**
 * Badge definitions (Stack Overflow style).
 * Maps unlock_type to display name, description, and tier (bronze / silver / gold).
 *
 * How each badge is triggered (all streak-based in milestones.ts):
 * - seven_day_streak: 7-day activity streak.
 * - theme: Legacy; same as seven_day_streak (display only).
 * - font (Sunbeam): 30-day streak.
 * - analytics (Blaze): 90-day streak.
 * - org_feature (Igniter): 180-day streak.
 * For testing: npx tsx src/scripts/award-badge.ts <userId> <type>
 */

export type BadgeTier = 'bronze' | 'silver' | 'gold';

export interface BadgeDef {
  name: string;
  description: string;
  tier: BadgeTier;
}

export const BADGES: Record<string, BadgeDef> = {
  seven_day_streak: {
    name: 'Flame Keeper',
    description: 'Maintained an activity streak for 7 days in a row',
    tier: 'bronze',
  },
  font: {
    name: 'Sunbeam',
    description: 'Maintained an activity streak for 30 days in a row',
    tier: 'silver',
  },
  analytics: {
    name: 'Blaze',
    description: 'Maintained an activity streak for 90 days in a row',
    tier: 'silver',
  },
  org_feature: {
    name: 'Igniter',
    description: 'Maintained an activity streak for 180 days in a row',
    tier: 'gold',
  },
};

export function getBadgeDef(type: string): BadgeDef {
  if (type === 'theme') return BADGES.seven_day_streak;
  return (
    BADGES[type] ?? {
      name: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      description: `Earned: ${type}`,
      tier: 'bronze',
    }
  );
}
