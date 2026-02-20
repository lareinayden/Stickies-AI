/**
 * Database operations for learning task schedule settings
 */

import { getDbPool } from './client';
import { LEARNING_TASK_SETTINGS_TABLE_SCHEMA } from './schema';
import type { LearningTaskSettingRecord } from './schema';

// Ensure the table exists on first use (handles deployments where initializeDatabase
// hasn't been re-run after this table was added)
let tableReady: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = getDbPool()
      .query(LEARNING_TASK_SETTINGS_TABLE_SCHEMA)
      .then(() => undefined)
      .catch((err) => {
        tableReady = null; // allow retry on next call
        throw err;
      });
  }
  return tableReady;
}

function mapRowToSetting(row: Record<string, unknown>): LearningTaskSettingRecord {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    domain: row.domain as string,
    frequency_days: row.frequency_days as number,
    last_generated_at: row.last_generated_at ? (row.last_generated_at as Date) : null,
    created_at: row.created_at as Date,
  };
}

/**
 * Get all learning task settings for a user
 */
export async function getLearningTaskSettings(
  userId: string
): Promise<LearningTaskSettingRecord[]> {
  await ensureTable();
  const db = getDbPool();
  const result = await db.query(
    'SELECT * FROM learning_task_settings WHERE user_id = $1 ORDER BY created_at ASC',
    [userId]
  );
  return result.rows.map(mapRowToSetting);
}

/**
 * Get the setting for a specific domain
 */
export async function getLearningTaskSetting(
  userId: string,
  domain: string
): Promise<LearningTaskSettingRecord | null> {
  await ensureTable();
  const db = getDbPool();
  const result = await db.query(
    'SELECT * FROM learning_task_settings WHERE user_id = $1 AND domain = $2',
    [userId, domain]
  );
  if (result.rows.length === 0) return null;
  return mapRowToSetting(result.rows[0]);
}

/**
 * Create or update the frequency setting for a domain.
 * frequencyDays = 0 disables auto-generation for this domain.
 */
export async function upsertLearningTaskSetting(
  userId: string,
  domain: string,
  frequencyDays: number
): Promise<LearningTaskSettingRecord> {
  await ensureTable();
  const db = getDbPool();
  const result = await db.query(
    `INSERT INTO learning_task_settings (user_id, domain, frequency_days)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, domain)
     DO UPDATE SET frequency_days = EXCLUDED.frequency_days
     RETURNING *`,
    [userId, domain, frequencyDays]
  );
  return mapRowToSetting(result.rows[0]);
}

/**
 * Update last_generated_at timestamp after a review task is created
 */
export async function updateLastGeneratedAt(
  userId: string,
  domain: string,
  now: Date
): Promise<void> {
  await ensureTable();
  const db = getDbPool();
  await db.query(
    `UPDATE learning_task_settings
     SET last_generated_at = $1
     WHERE user_id = $2 AND domain = $3`,
    [now, userId, domain]
  );
}
