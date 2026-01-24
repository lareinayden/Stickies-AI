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

export interface TaskRecord {
  id: string; // UUID
  transcription_id: string; // Reference to transcription
  ingestion_id: string; // Reference to ingestion for easy lookup
  title: string; // Task/reminder title
  description: string | null; // Optional detailed description
  type: 'task' | 'reminder' | 'note'; // Type of item
  priority: 'low' | 'medium' | 'high' | null; // Priority level
  due_date: Date | null; // Optional due date
  completed: boolean; // Completion status
  completed_at: Date | null; // When it was completed
  created_at: Date;
  metadata: Record<string, unknown> | null; // Additional metadata
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

/**
 * SQL schema for tasks table
 */
export const TASKS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transcription_id UUID REFERENCES transcriptions(id) ON DELETE CASCADE,
    ingestion_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'task',
    priority VARCHAR(10),
    due_date TIMESTAMP,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_transcription_id ON tasks(transcription_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_ingestion_id ON tasks(ingestion_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
  CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
`;
