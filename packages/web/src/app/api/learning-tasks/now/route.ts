/**
 * POST /api/learning-tasks/now
 *
 * Immediately creates a "Review [domain]" task at 9 AM today for the given
 * domain. No LLM — direct DB insert, completes in ~100 ms.
 *
 * Called when the user taps a frequency chip in the Learning tab so the task
 * appears in the Tasks tab right away.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getDbPool } from '@/lib/db/client';
import { updateLastGeneratedAt } from '@/lib/db/learning-task-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lazy migration: drop NOT NULL on transcription_id if the DB was originally
// created with that constraint (initializeDatabase is not auto-called in dev).
let migrationDone: Promise<void> | null = null;
function ensureTranscriptionIdNullable(): Promise<void> {
  if (!migrationDone) {
    migrationDone = getDbPool()
      .query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tasks'
              AND column_name = 'transcription_id'
              AND is_nullable = 'NO'
          ) THEN
            ALTER TABLE tasks ALTER COLUMN transcription_id DROP NOT NULL;
          END IF;
        END $$;
      `)
      .then(() => undefined)
      .catch((err) => {
        migrationDone = null; // allow retry on next request
        throw err;
      });
  }
  return migrationDone;
}

function nineAmToday(): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth(request);

    const body = (await request.json()) as { domain?: unknown };
    if (typeof body.domain !== 'string' || !body.domain.trim()) {
      return NextResponse.json({ error: 'domain is required' }, { status: 400 });
    }

    const domain = body.domain.trim();
    const ingestionId = `learning:${encodeURIComponent(domain)}`;
    const dueDate = nineAmToday();

    // Ensure the column is nullable before inserting
    await ensureTranscriptionIdNullable();

    const db = getDbPool();
    const result = await db.query(
      `INSERT INTO tasks (user_id, transcription_id, ingestion_id, title, description, type, priority, due_date)
       VALUES ($1, NULL, $2, $3, NULL, 'task', 'medium', $4)
       RETURNING *`,
      [userId, ingestionId, `Review ${domain}`, dueDate]
    );
    const row = result.rows[0];

    await updateLastGeneratedAt(userId, domain, new Date());

    return NextResponse.json({
      task: {
        id: row.id as string,
        title: row.title as string,
        description: (row.description as string | null) ?? null,
        type: row.type as string,
        priority: (row.priority as string | null) ?? null,
        dueDate: row.due_date ? (row.due_date as Date).toISOString() : null,
        createdAt: (row.created_at as Date).toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create task' },
      { status: 500 }
    );
  }
}
