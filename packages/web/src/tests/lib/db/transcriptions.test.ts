/**
 * Unit tests for transcription database operations
 * 
 * Note: These tests require a test database to be set up.
 * Set DB_NAME=stickies_ai_test in your test environment.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTranscription,
  getTranscriptionByIngestionId,
  updateTranscriptionStatus,
  completeTranscription,
  failTranscription,
  deleteTranscription,
} from '../../../lib/db/transcriptions';
import { initializeDatabase, closeDbPool } from '../../../lib/db/client';
import { generateIngestionId } from '../../../lib/utils/ingestion-id';

describe('Transcription Database Operations', () => {
  beforeAll(async () => {
    // Initialize database schema before tests
    await initializeDatabase();
  });

  afterAll(async () => {
    // Close database connection after all tests
    await closeDbPool();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    // In a real scenario, you'd use a test database or transaction rollback
  });

  it('should create a new transcription record', async () => {
    const ingestionId = generateIngestionId();
    const transcription = await createTranscription(ingestionId, 'test.wav', 1024);

    expect(transcription).toBeDefined();
    expect(transcription.ingestion_id).toBe(ingestionId);
    expect(transcription.status).toBe('pending');
    expect(transcription.original_filename).toBe('test.wav');
    expect(transcription.file_size).toBe(1024);
  });

  it('should retrieve transcription by ingestion ID', async () => {
    const ingestionId = generateIngestionId();
    await createTranscription(ingestionId, 'test.wav');

    const transcription = await getTranscriptionByIngestionId(ingestionId);

    expect(transcription).toBeDefined();
    expect(transcription?.ingestion_id).toBe(ingestionId);
  });

  it('should return null for non-existent ingestion ID', async () => {
    const transcription = await getTranscriptionByIngestionId('non-existent-id');
    expect(transcription).toBeNull();
  });

  it('should update transcription status', async () => {
    const ingestionId = generateIngestionId();
    await createTranscription(ingestionId);

    const updated = await updateTranscriptionStatus(ingestionId, 'processing');

    expect(updated.status).toBe('processing');
  });

  it('should complete transcription with transcript data', async () => {
    const ingestionId = generateIngestionId();
    await createTranscription(ingestionId);

    const segments = [
      { start: 0, end: 2.5, text: 'Hello world' },
      { start: 2.5, end: 5.0, text: 'This is a test' },
    ];

    const completed = await completeTranscription(
      ingestionId,
      'Hello world. This is a test.',
      segments,
      { overall: 0.95 },
      { source: 'test' }
    );

    expect(completed.status).toBe('completed');
    expect(completed.transcript).toBe('Hello world. This is a test.');
    expect(completed.segments).toEqual(segments);
    expect(completed.completed_at).not.toBeNull();
  });

  it('should mark transcription as failed', async () => {
    const ingestionId = generateIngestionId();
    await createTranscription(ingestionId);

    const failed = await failTranscription(ingestionId, 'Processing error');

    expect(failed.status).toBe('failed');
    expect(failed.error_message).toBe('Processing error');
  });

  it('should delete transcription', async () => {
    const ingestionId = generateIngestionId();
    await createTranscription(ingestionId);

    const deleted = await deleteTranscription(ingestionId);
    expect(deleted).toBe(true);

    const transcription = await getTranscriptionByIngestionId(ingestionId);
    expect(transcription).toBeNull();
  });
});
