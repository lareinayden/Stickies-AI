import { getDbPool } from './client';
import type { UnlockRecord, UnlockType } from './schema';

export async function getUserUnlocks(userId: string): Promise<UnlockRecord[]> {
  const db = getDbPool();
  const result = await db.query('SELECT * FROM unlocks WHERE user_id = $1', [
    userId,
  ]);

  return result.rows.map(mapRowToUnlock);
}

export async function getUnlock(
  userId: string,
  unlockType: UnlockType
): Promise<UnlockRecord | null> {
  const db = getDbPool();
  const result = await db.query(
    'SELECT * FROM unlocks WHERE user_id = $1 AND unlock_type = $2',
    [userId, unlockType]
  );

  if (result.rows.length === 0) return null;
  return mapRowToUnlock(result.rows[0]);
}

export async function ensureUnlock(
  userId: string,
  unlockType: UnlockType,
  metadata?: Record<string, unknown> | null
): Promise<UnlockRecord> {
  const db = getDbPool();

  const result = await db.query(
    `
      INSERT INTO unlocks (user_id, unlock_type, metadata)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, unlock_type)
      DO UPDATE SET
        is_enabled = TRUE,
        metadata = COALESCE(EXCLUDED.metadata, unlocks.metadata),
        earned_at = unlocks.earned_at
      RETURNING *
    `,
    [userId, unlockType, metadata ?? null]
  );

  return mapRowToUnlock(result.rows[0]);
}

function mapRowToUnlock(row: Record<string, unknown>): UnlockRecord {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    unlock_type: row.unlock_type as UnlockType,
    is_enabled: Boolean(row.is_enabled),
    earned_at: row.earned_at as Date,
    metadata: row.metadata
      ? (row.metadata as Record<string, unknown>)
      : null,
  };
}

