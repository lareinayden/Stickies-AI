/**
 * Database operations for learning stickies
 */

import { getDbPool } from './client';
import type { LearningStickyRecord } from './schema';

function mapRowToLearningSticky(row: Record<string, unknown>): LearningStickyRecord {
  const relatedTerms = row.related_terms;
  return {
    id: row.id as string,
    user_id: (row.user_id ?? '') as string,
    transcription_id: (row.transcription_id as string) ?? null,
    ingestion_id: (row.ingestion_id as string) ?? null,
    domain: (row.domain as string) ?? null,
    concept: row.concept as string,
    definition: row.definition as string,
    example: row.example as string | null,
    related_terms: Array.isArray(relatedTerms) ? (relatedTerms as string[]) : [],
    created_at: row.created_at as Date,
    metadata: row.metadata as Record<string, unknown> | null,
  };
}

/**
 * Create multiple learning stickies from a transcription (voice pipeline)
 */
export async function createLearningStickies(
  userId: string,
  transcriptionId: string,
  ingestionId: string,
  stickies: Array<{
    concept: string;
    definition: string;
    example?: string | null;
    relatedTerms?: string[];
  }>
): Promise<LearningStickyRecord[]> {
  const db = getDbPool();
  const client = await db.connect();
  const created: LearningStickyRecord[] = [];
  try {
    await client.query('BEGIN');
    for (const s of stickies) {
      const query = `
        INSERT INTO learning_stickies (
          user_id, transcription_id, ingestion_id, domain,
          concept, definition, example, related_terms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const values = [
        userId,
        transcriptionId,
        ingestionId,
        null,
        s.concept,
        s.definition,
        s.example ?? null,
        JSON.stringify(s.relatedTerms ?? []),
      ];
      const result = await client.query(query, values);
      created.push(mapRowToLearningSticky(result.rows[0]));
    }
    await client.query('COMMIT');
    return created;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Create learning stickies generated from a user-provided domain (area of interest).
 * No transcription; stickies are LLM-generated for the given domain.
 */
export async function createLearningStickiesForDomain(
  userId: string,
  domain: string,
  stickies: Array<{
    concept: string;
    definition: string;
    example?: string | null;
    relatedTerms?: string[];
  }>
): Promise<LearningStickyRecord[]> {
  const db = getDbPool();
  const client = await db.connect();
  const created: LearningStickyRecord[] = [];
  try {
    await client.query('BEGIN');
    for (const s of stickies) {
      const query = `
        INSERT INTO learning_stickies (
          user_id, transcription_id, ingestion_id, domain,
          concept, definition, example, related_terms
        )
        VALUES ($1, NULL, NULL, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const values = [
        userId,
        domain,
        s.concept,
        s.definition,
        s.example ?? null,
        JSON.stringify(s.relatedTerms ?? []),
      ];
      const result = await client.query(query, values);
      created.push(mapRowToLearningSticky(result.rows[0]));
    }
    await client.query('COMMIT');
    return created;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Get all learning stickies for a user (optionally by ingestion or transcription)
 */
export async function getLearningStickies(
  userId: string,
  filters?: {
    ingestionId?: string;
    transcriptionId?: string;
    domain?: string;
    limit?: number;
    offset?: number;
  }
): Promise<LearningStickyRecord[]> {
  const db = getDbPool();
  let query = 'SELECT * FROM learning_stickies WHERE (user_id = $1 OR user_id IS NULL)';
  const values: unknown[] = [userId];
  let paramIndex = 2;
  if (filters?.ingestionId) {
    query += ` AND ingestion_id = $${paramIndex}`;
    values.push(filters.ingestionId);
    paramIndex += 1;
  }
  if (filters?.transcriptionId) {
    query += ` AND transcription_id = $${paramIndex}`;
    values.push(filters.transcriptionId);
    paramIndex += 1;
  }
  if (filters?.domain) {
    query += ` AND domain = $${paramIndex}`;
    values.push(filters.domain);
    paramIndex += 1;
  }
  query += ' ORDER BY created_at DESC';
  if (filters?.limit) {
    query += ` LIMIT $${paramIndex}`;
    values.push(filters.limit);
    paramIndex += 1;
  }
  if (filters?.offset) {
    query += ` OFFSET $${paramIndex}`;
    values.push(filters.offset);
  }
  const result = await db.query(query, values);
  return result.rows.map(mapRowToLearningSticky);
}

/**
 * Get learning stickies by ingestion ID (for a specific user)
 */
export async function getLearningStickiesByIngestionId(
  userId: string,
  ingestionId: string
): Promise<LearningStickyRecord[]> {
  return getLearningStickies(userId, { ingestionId });
}

/**
 * Get distinct areas of interest (domains) for a user with sticky count per domain.
 * Only includes stickies that have a non-null domain.
 */
export async function getDomains(
  userId: string
): Promise<Array<{ domain: string; count: number }>> {
  const db = getDbPool();
  const result = await db.query(
    `SELECT domain, COUNT(*)::int AS count
     FROM learning_stickies
     WHERE (user_id = $1 OR user_id IS NULL) AND domain IS NOT NULL AND domain != ''
     GROUP BY domain
     ORDER BY MAX(created_at) DESC`,
    [userId]
  );
  return result.rows.map((r) => ({
    domain: r.domain as string,
    count: r.count as number,
  }));
}

/**
 * Delete a single learning sticky by id (must belong to user).
 */
export async function deleteLearningSticky(
  userId: string,
  id: string
): Promise<boolean> {
  const db = getDbPool();
  const result = await db.query(
    'DELETE FROM learning_stickies WHERE id = $1 AND (user_id = $2 OR user_id IS NULL) RETURNING id',
    [id, userId]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Delete all learning stickies for a domain (must belong to user).
 */
export async function deleteLearningStickiesByDomain(
  userId: string,
  domain: string
): Promise<number> {
  const db = getDbPool();
  const result = await db.query(
    'DELETE FROM learning_stickies WHERE domain = $1 AND (user_id = $2 OR user_id IS NULL) RETURNING id',
    [domain, userId]
  );
  return result.rowCount ?? 0;
}

/**
 * Combine multiple domains into one: set domain of all stickies in fromDomains to newDomain.
 * User must own the stickies. Returns the number of stickies updated.
 */
export async function updateStickiesDomains(
  userId: string,
  fromDomains: string[],
  newDomain: string
): Promise<number> {
  if (fromDomains.length === 0 || !newDomain.trim()) return 0;
  const db = getDbPool();
  const result = await db.query(
    `UPDATE learning_stickies
     SET domain = $1
     WHERE (user_id = $2 OR user_id IS NULL) AND domain = ANY($3::text[])
     RETURNING id`,
    [newDomain.trim(), userId, fromDomains]
  );
  return result.rowCount ?? 0;
}
