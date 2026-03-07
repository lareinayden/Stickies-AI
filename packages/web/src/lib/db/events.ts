import { getDbPool } from './client';
import type { EventRecord } from './schema';

type EventMetadata = Record<string, unknown> | null | undefined;

export async function createEvent(
  userId: string,
  eventType: string,
  metadata?: EventMetadata,
  occurredAt?: Date
): Promise<EventRecord> {
  const db = getDbPool();

  const result = occurredAt
    ? await db.query(
        `
      INSERT INTO events (user_id, event_type, metadata, occurred_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
        [userId, eventType, metadata ?? null, occurredAt]
      )
    : await db.query(
        `
      INSERT INTO events (user_id, event_type, metadata)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
        [userId, eventType, metadata ?? null]
      );

  return mapRowToEvent(result.rows[0]);
}

export async function createTaskCompletedEvent(
  userId: string,
  task: {
    id: string;
    title: string;
    type: string;
    ingestionId: string;
    completedAt: Date | null;
  }
): Promise<EventRecord> {
  const occurredAt = task.completedAt ?? new Date();
  return createEvent(userId, 'task_completed', {
    taskId: task.id,
    title: task.title,
    type: task.type,
    ingestionId: task.ingestionId,
    completedAt: task.completedAt?.toISOString() ?? null,
  }, occurredAt);
}

export async function createStickyReviewedEvent(
  userId: string,
  payload: {
    stickyId: string;
    domain?: string | null;
    status: 'needs_review' | 'learned';
  }
): Promise<EventRecord> {
  return createEvent(userId, 'sticky_reviewed', {
    stickyId: payload.stickyId,
    domain: payload.domain ?? null,
    status: payload.status,
  });
}

function mapRowToEvent(row: Record<string, unknown>): EventRecord {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    event_type: row.event_type as string,
    occurred_at: row.occurred_at as Date,
    metadata: row.metadata
      ? (row.metadata as Record<string, unknown>)
      : null,
  };
}

