/**
 * Database operations for transcriptions
 */

import { getDbPool } from './client';
import type { TranscriptionRecord, TranscriptionSegment } from './schema';

/**
 * Create a new transcription record
 */
export async function createTranscription(
  userId: string,
  ingestionId: string,
  originalFilename?: string,
  fileSize?: number
): Promise<TranscriptionRecord> {
  const db = getDbPool();
  
  const query = `
    INSERT INTO transcriptions (user_id, ingestion_id, status, original_filename, file_size)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  
  const values = [userId, ingestionId, 'pending', originalFilename || null, fileSize || null];
  
  const result = await db.query(query, values);
  return mapRowToTranscription(result.rows[0]);
}

/**
 * Get transcription by ingestion ID (for a specific user)
 */
export async function getTranscriptionByIngestionId(
  userId: string,
  ingestionId: string
): Promise<TranscriptionRecord | null> {
  const db = getDbPool();
  
  const query = 'SELECT * FROM transcriptions WHERE user_id = $1 AND ingestion_id = $2';
  const result = await db.query(query, [userId, ingestionId]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapRowToTranscription(result.rows[0]);
}

/**
 * Get transcription by ID (for a specific user)
 */
export async function getTranscriptionById(
  userId: string,
  id: string
): Promise<TranscriptionRecord | null> {
  const db = getDbPool();
  
  const query = 'SELECT * FROM transcriptions WHERE user_id = $1 AND id = $2';
  const result = await db.query(query, [userId, id]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapRowToTranscription(result.rows[0]);
}

/**
 * Update transcription status (for a specific user)
 */
export async function updateTranscriptionStatus(
  userId: string,
  ingestionId: string,
  status: TranscriptionRecord['status'],
  errorMessage?: string
): Promise<TranscriptionRecord> {
  const db = getDbPool();
  
  const query = `
    UPDATE transcriptions
    SET status = $1, error_message = $2
    WHERE user_id = $3 AND ingestion_id = $4
    RETURNING *
  `;
  
  const values = [status, errorMessage || null, userId, ingestionId];
  const result = await db.query(query, values);
  
  if (result.rows.length === 0) {
    throw new Error(`Transcription with ingestion_id ${ingestionId} not found`);
  }
  
  return mapRowToTranscription(result.rows[0]);
}

/**
 * Update transcription with audio metadata (for a specific user)
 */
export async function updateTranscriptionMetadata(
  userId: string,
  ingestionId: string,
  metadata: {
    durationSeconds?: number;
    audioFormat?: string;
    language?: string;
  }
): Promise<TranscriptionRecord> {
  const db = getDbPool();
  
  const query = `
    UPDATE transcriptions
    SET duration_seconds = COALESCE($1, duration_seconds),
        audio_format = COALESCE($2, audio_format),
        language = COALESCE($3, language)
    WHERE user_id = $4 AND ingestion_id = $5
    RETURNING *
  `;
  
  const values = [
    metadata.durationSeconds || null,
    metadata.audioFormat || null,
    metadata.language || null,
    userId,
    ingestionId,
  ];
  
  const result = await db.query(query, values);
  
  if (result.rows.length === 0) {
    throw new Error(`Transcription with ingestion_id ${ingestionId} not found`);
  }
  
  return mapRowToTranscription(result.rows[0]);
}

/**
 * Complete transcription with transcript data (for a specific user)
 */
export async function completeTranscription(
  userId: string,
  ingestionId: string,
  transcript: string,
  segments?: TranscriptionSegment[],
  confidenceScores?: Record<string, number>,
  metadata?: Record<string, unknown>
): Promise<TranscriptionRecord> {
  const db = getDbPool();
  
  const query = `
    UPDATE transcriptions
    SET status = 'completed',
        transcript = $1,
        segments = $2,
        confidence_scores = $3,
        metadata = $4,
        completed_at = CURRENT_TIMESTAMP
    WHERE user_id = $5 AND ingestion_id = $6
    RETURNING *
  `;
  
  const values = [
    transcript,
    segments ? JSON.stringify(segments) : null,
    confidenceScores ? JSON.stringify(confidenceScores) : null,
    metadata ? JSON.stringify(metadata) : null,
    userId,
    ingestionId,
  ];
  
  const result = await db.query(query, values);
  
  if (result.rows.length === 0) {
    throw new Error(`Transcription with ingestion_id ${ingestionId} not found`);
  }
  
  return mapRowToTranscription(result.rows[0]);
}

/**
 * Mark transcription as failed (for a specific user)
 */
export async function failTranscription(
  userId: string,
  ingestionId: string,
  errorMessage: string
): Promise<TranscriptionRecord> {
  return updateTranscriptionStatus(userId, ingestionId, 'failed', errorMessage);
}

/**
 * Get all transcriptions for a user with optional filters
 */
export async function getTranscriptions(
  userId: string,
  filters?: {
    status?: TranscriptionRecord['status'];
    limit?: number;
    offset?: number;
  }
): Promise<TranscriptionRecord[]> {
  const db = getDbPool();
  
  let query = 'SELECT * FROM transcriptions WHERE user_id = $1';
  const values: unknown[] = [userId];
  const conditions: string[] = [];
  
  if (filters?.status) {
    conditions.push(`status = $${values.length + 1}`);
    values.push(filters.status);
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
  return result.rows.map(mapRowToTranscription);
}

/**
 * Delete transcription by ingestion ID (for a specific user)
 */
export async function deleteTranscription(userId: string, ingestionId: string): Promise<boolean> {
  const db = getDbPool();
  
  const query = 'DELETE FROM transcriptions WHERE user_id = $1 AND ingestion_id = $2';
  const result = await db.query(query, [userId, ingestionId]);
  
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Map database row to TranscriptionRecord
 */
function mapRowToTranscription(row: Record<string, unknown>): TranscriptionRecord {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    ingestion_id: row.ingestion_id as string,
    status: row.status as TranscriptionRecord['status'],
    original_filename: row.original_filename as string | null,
    file_size: row.file_size as number | null,
    duration_seconds: row.duration_seconds as number | null,
    audio_format: row.audio_format as string | null,
    language: row.language as string | null,
    created_at: row.created_at as Date,
    completed_at: row.completed_at as Date | null,
    error_message: row.error_message as string | null,
    transcript: row.transcript as string | null,
    segments: row.segments ? (row.segments as TranscriptionSegment[]) : null,
    confidence_scores: row.confidence_scores
      ? (row.confidence_scores as Record<string, number>)
      : null,
    metadata: row.metadata ? (row.metadata as Record<string, unknown>) : null,
  };
}
