/**
 * Award a badge to a user (for testing or when implementing new triggers).
 *
 * Usage (from packages/web):
 *   npx tsx src/scripts/award-badge.ts <userId> <badgeType>
 *
 * Badge types: seven_day_streak | font | analytics | org_feature
 *
 * Example:
 *   npx tsx src/scripts/award-badge.ts shirley font
 *   npx tsx src/scripts/award-badge.ts shirley analytics
 *   npx tsx src/scripts/award-badge.ts shirley org_feature
 *
 * Requires: DB_* env and initialized schema.
 */

import { getDbPool } from '@/lib/db/client';
import { ensureUnlock } from '@/lib/db/unlocks';
import { getBadgeDef } from '@/lib/badges';
import type { UnlockType } from '@/lib/db/schema';

const VALID_TYPES: UnlockType[] = [
  'theme',
  'seven_day_streak',
  'font',
  'analytics',
  'org_feature',
];

async function main() {
  const userId = process.argv[2];
  const type = process.argv[3];

  if (!userId || !type) {
    console.log('Usage: npx tsx src/scripts/award-badge.ts <userId> <badgeType>');
    console.log('Badge types:', VALID_TYPES.join(', '));
    process.exit(1);
  }

  if (!VALID_TYPES.includes(type as UnlockType)) {
    console.error('Invalid badge type. Use one of:', VALID_TYPES.join(', '));
    process.exit(1);
  }

  getDbPool();

  const unlock = await ensureUnlock(userId, type as UnlockType, {
    source: 'script',
    awardedAt: new Date().toISOString(),
  });

  const badge = getBadgeDef(type);
  console.log(`Awarded "${badge.name}" (${type}) to ${userId}`);
  console.log(`  Earned at: ${unlock.earned_at.toISOString().slice(0, 10)}`);
  console.log('  Open Rewards → Badges in the app to see it.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
