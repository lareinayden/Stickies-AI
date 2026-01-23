/**
 * Database schema definitions for the voice input pipeline
 */

export interface TranscriptionRecord {
  id: string; // UUID
  ingestion_id: string; // Unique ingestion identifier
  status: 'pending' | 'processing' | 'completed' | 'failed';
  original_filename: string | null;
  file_size: number | null;
  duration_seconds: number | null;
  audio_format: string | null;
  language: string | null;
  created_at: Date;
  completed_at: Date | null;
  error_message: string | null;
  transcript: string | null;
  segments: TranscriptionSegment[] | null;
  confidence_scores: Record<string, number> | null;
  metadata: Record<string, unknown> | null;
}

export interface TranscriptionSegment {
  start: number; // Start time in seconds
  end: number; // End time in seconds
  text: string; // Transcribed text for this segment
}

/**
 * SQL schema for transcriptions table
 */
export const TRANSCRIPTIONS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS transcriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingestion_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    original_filename VARCHAR(255),
    file_size BIGINT,
    duration_seconds FLOAT,
    audio_format VARCHAR(10),
    language VARCHAR(10),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    transcript TEXT,
    segments JSONB,
    confidence_scores JSONB,
    metadata JSONB
  );

  CREATE INDEX IF NOT EXISTS idx_transcriptions_ingestion_id ON transcriptions(ingestion_id);
  CREATE INDEX IF NOT EXISTS idx_transcriptions_status ON transcriptions(status);
  CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at ON transcriptions(created_at);
`;
