/**
 * Database operations for tasks and reminders
 */

import { getDbPool } from './client';
import type { TaskRecord } from './schema';

/**
 * Create a new task from a transcription
 */
export async function createTask(
  transcriptionId: string,
  ingestionId: string,
  task: {
    title: string;
    description?: string | null;
    type?: 'task' | 'reminder' | 'note';
    priority?: 'low' | 'medium' | 'high' | null;
    dueDate?: Date | null;
    metadata?: Record<string, unknown> | null;
  }
): Promise<TaskRecord> {
  const db = getDbPool();

  const query = `
    INSERT INTO tasks (
      transcription_id,
      ingestion_id,
      title,
      description,
      type,
      priority,
      due_date,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const values = [
    transcriptionId,
    ingestionId,
    task.title,
    task.description || null,
    task.type || 'task',
    task.priority || null,
    task.dueDate || null,
    task.metadata ? JSON.stringify(task.metadata) : null,
  ];

  const result = await db.query(query, values);
  return mapRowToTask(result.rows[0]);
}

/**
 * Create multiple tasks from a transcription
 */
export async function createTasks(
  transcriptionId: string,
  ingestionId: string,
  tasks: Array<{
    title: string;
    description?: string | null;
    type?: 'task' | 'reminder' | 'note';
    priority?: 'low' | 'medium' | 'high' | null;
    dueDate?: Date | null;
    metadata?: Record<string, unknown> | null;
  }>
): Promise<TaskRecord[]> {
  const db = getDbPool();

  // Use a transaction to insert all tasks
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const createdTasks: TaskRecord[] = [];
    for (const task of tasks) {
      const query = `
        INSERT INTO tasks (
          transcription_id,
          ingestion_id,
          title,
          description,
          type,
          priority,
          due_date,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        transcriptionId,
        ingestionId,
        task.title,
        task.description || null,
        task.type || 'task',
        task.priority || null,
        task.dueDate || null,
        task.metadata ? JSON.stringify(task.metadata) : null,
      ];

      const result = await client.query(query, values);
      createdTasks.push(mapRowToTask(result.rows[0]));
    }

    await client.query('COMMIT');
    return createdTasks;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get task by ID
 */
export async function getTaskById(id: string): Promise<TaskRecord | null> {
  const db = getDbPool();

  const query = 'SELECT * FROM tasks WHERE id = $1';
  const result = await db.query(query, [id]);

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToTask(result.rows[0]);
}

/**
 * Get all tasks for a transcription
 */
export async function getTasksByTranscriptionId(
  transcriptionId: string
): Promise<TaskRecord[]> {
  const db = getDbPool();

  const query = 'SELECT * FROM tasks WHERE transcription_id = $1 ORDER BY created_at ASC';
  const result = await db.query(query, [transcriptionId]);

  return result.rows.map(mapRowToTask);
}

/**
 * Get all tasks for an ingestion ID
 */
export async function getTasksByIngestionId(
  ingestionId: string
): Promise<TaskRecord[]> {
  const db = getDbPool();

  const query = 'SELECT * FROM tasks WHERE ingestion_id = $1 ORDER BY created_at ASC';
  const result = await db.query(query, [ingestionId]);

  return result.rows.map(mapRowToTask);
}

/**
 * Get all tasks with optional filters
 */
export async function getTasks(filters?: {
  completed?: boolean;
  type?: 'task' | 'reminder' | 'note';
  priority?: 'low' | 'medium' | 'high';
  limit?: number;
  offset?: number;
}): Promise<TaskRecord[]> {
  const db = getDbPool();

  let query = 'SELECT * FROM tasks WHERE 1=1';
  const values: unknown[] = [];
  const conditions: string[] = [];

  if (filters?.completed !== undefined) {
    conditions.push(`completed = $${values.length + 1}`);
    values.push(filters.completed);
  }

  if (filters?.type) {
    conditions.push(`type = $${values.length + 1}`);
    values.push(filters.type);
  }

  if (filters?.priority) {
    conditions.push(`priority = $${values.length + 1}`);
    values.push(filters.priority);
  }

  if (conditions.length > 0) {
    query += ' AND ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';

  if (filters?.limit) {
    query += ` LIMIT $${values.length + 1}`;
    values.push(filters.limit);
  }

  if (filters?.offset) {
    query += ` OFFSET $${values.length + 1}`;
    values.push(filters.offset);
  }

  const result = await db.query(query, values);
  return result.rows.map(mapRowToTask);
}

/**
 * Update task completion status
 */
export async function updateTaskCompletion(
  id: string,
  completed: boolean
): Promise<TaskRecord> {
  const db = getDbPool();

  const query = `
    UPDATE tasks
    SET completed = $1,
        completed_at = CASE WHEN $1 THEN CURRENT_TIMESTAMP ELSE NULL END
    WHERE id = $2
    RETURNING *
  `;

  const result = await db.query(query, [completed, id]);

  if (result.rows.length === 0) {
    throw new Error(`Task with id ${id} not found`);
  }

  return mapRowToTask(result.rows[0]);
}

/**
 * Update task
 */
export async function updateTask(
  id: string,
  updates: {
    title?: string;
    description?: string | null;
    type?: 'task' | 'reminder' | 'note';
    priority?: 'low' | 'medium' | 'high' | null;
    dueDate?: Date | null;
  }
): Promise<TaskRecord> {
  const db = getDbPool();

  const setClauses: string[] = [];
  const values: unknown[] = [];

  if (updates.title !== undefined) {
    setClauses.push(`title = $${values.length + 1}`);
    values.push(updates.title);
  }

  if (updates.description !== undefined) {
    setClauses.push(`description = $${values.length + 1}`);
    values.push(updates.description);
  }

  if (updates.type !== undefined) {
    setClauses.push(`type = $${values.length + 1}`);
    values.push(updates.type);
  }

  if (updates.priority !== undefined) {
    setClauses.push(`priority = $${values.length + 1}`);
    values.push(updates.priority);
  }

  if (updates.dueDate !== undefined) {
    setClauses.push(`due_date = $${values.length + 1}`);
    values.push(updates.dueDate);
  }

  if (setClauses.length === 0) {
    throw new Error('No updates provided');
  }

  values.push(id);

  const query = `
    UPDATE tasks
    SET ${setClauses.join(', ')}
    WHERE id = $${values.length}
    RETURNING *
  `;

  const result = await db.query(query, values);

  if (result.rows.length === 0) {
    throw new Error(`Task with id ${id} not found`);
  }

  return mapRowToTask(result.rows[0]);
}

/**
 * Delete task by ID
 */
export async function deleteTask(id: string): Promise<boolean> {
  const db = getDbPool();

  const query = 'DELETE FROM tasks WHERE id = $1';
  const result = await db.query(query, [id]);

  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Map database row to TaskRecord
 */
function mapRowToTask(row: Record<string, unknown>): TaskRecord {
  return {
    id: row.id as string,
    transcription_id: row.transcription_id as string,
    ingestion_id: row.ingestion_id as string,
    title: row.title as string,
    description: row.description as string | null,
    type: row.type as 'task' | 'reminder' | 'note',
    priority: row.priority as 'low' | 'medium' | 'high' | null,
    due_date: row.due_date ? (row.due_date as Date) : null,
    completed: row.completed as boolean,
    completed_at: row.completed_at ? (row.completed_at as Date) : null,
    created_at: row.created_at as Date,
    metadata: row.metadata
      ? (row.metadata as Record<string, unknown>)
      : null,
  };
}
