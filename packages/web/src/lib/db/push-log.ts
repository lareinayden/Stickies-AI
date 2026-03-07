/**
 * Push log: record when a notification is scheduled/delivered for adaptive timing verification.
 */

import { getDbPool } from './client';
import type { PushLogRecord } from './schema';

export async function logScheduledPush(
  userId: string,
  scheduledFor: Date,
  peakStartHour: number,
  payload?: Record<string, unknown>
): Promise<PushLogRecord> {
  const db = getDbPool();
  const result = await db.query(
    `
    INSERT INTO push_log (user_id, scheduled_for, peak_start_hour, payload)
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [userId, scheduledFor, peakStartHour, payload ? JSON.stringify(payload) : null]
  );
  const row = result.rows[0];
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    scheduled_for: row.scheduled_for as Date,
    delivered_at: row.delivered_at as Date | null,
    peak_start_hour: row.peak_start_hour as number,
    payload: row.payload as Record<string, unknown> | null,
    created_at: row.created_at as Date,
  };
}

export async function markPushDelivered(logId: string): Promise<void> {
  const db = getDbPool();
  await db.query(
    `UPDATE push_log SET delivered_at = NOW() WHERE id = $1`,
    [logId]
  );
}

export async function getRecentPushLogs(
  userId: string,
  limit: number = 10
): Promise<PushLogRecord[]> {
  const db = getDbPool();
  const result = await db.query(
    `
    SELECT * FROM push_log
    WHERE user_id = $1
    ORDER BY scheduled_for DESC
    LIMIT $2
    `,
    [userId, limit]
  );
  return result.rows.map((row) => ({
    id: row.id as string,
    user_id: row.user_id as string,
    scheduled_for: row.scheduled_for as Date,
    delivered_at: row.delivered_at as Date | null,
    peak_start_hour: row.peak_start_hour as number,
    payload: row.payload as Record<string, unknown> | null,
    created_at: row.created_at as Date,
  }));
}
