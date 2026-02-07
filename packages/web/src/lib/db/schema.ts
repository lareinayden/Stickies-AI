/**
 * Database schema definitions for the voice input pipeline
 */

export interface TranscriptionRecord {
  id: string; // UUID
  user_id: string; // User who owns this transcription
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
  user_id: string; // User who owns this task
  transcription_id: string | null; // Reference to transcription (null when from typed text)
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

export interface LearningStickyRecord {
  id: string; // UUID
  user_id: string;
  transcription_id: string | null; // null when generated from domain (no voice transcript)
  ingestion_id: string | null; // null when generated from domain
  domain: string | null; // user-provided area of interest (e.g. "React hooks", "machine learning")
  concept: string;
  definition: string;
  example: string | null;
  related_terms: string[]; // stored as JSONB
  created_at: Date;
  metadata: Record<string, unknown> | null;
}

/**
 * SQL schema for transcriptions table (without user_id for backward compatibility)
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
 * Migration to add user_id column to existing transcriptions table
 * Adds as nullable first (for existing data), then creates index
 */
export const MIGRATE_TRANSCRIPTIONS_USER_ID = `
  DO $$ 
  BEGIN
    -- Add column if it doesn't exist (nullable for existing rows)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'transcriptions' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE transcriptions ADD COLUMN user_id VARCHAR(255);
    END IF;
    
    -- Create index only if column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'transcriptions' AND column_name = 'user_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON transcriptions(user_id);
    END IF;
  END $$;
`;

/**
 * SQL schema for tasks table (without user_id for backward compatibility)
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

/**
 * Migration to add user_id column to existing tasks table
 * Adds as nullable first (for existing data), then creates index
 */
export const MIGRATE_TASKS_USER_ID = `
  DO $$ 
  BEGIN
    -- Add column if it doesn't exist (nullable for existing rows)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tasks' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE tasks ADD COLUMN user_id VARCHAR(255);
    END IF;
    
    -- Create index only if column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tasks' AND column_name = 'user_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    END IF;
  END $$;
`;

/**
 * SQL schema for learning_stickies table
 */
export const LEARNING_STICKIES_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS learning_stickies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    transcription_id UUID REFERENCES transcriptions(id) ON DELETE CASCADE,
    ingestion_id VARCHAR(255),
    domain VARCHAR(500),
    concept VARCHAR(500) NOT NULL,
    definition TEXT NOT NULL,
    example TEXT,
    related_terms JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
  );

  CREATE INDEX IF NOT EXISTS idx_learning_stickies_user_id ON learning_stickies(user_id);
  CREATE INDEX IF NOT EXISTS idx_learning_stickies_transcription_id ON learning_stickies(transcription_id);
  CREATE INDEX IF NOT EXISTS idx_learning_stickies_ingestion_id ON learning_stickies(ingestion_id);
  CREATE INDEX IF NOT EXISTS idx_learning_stickies_domain ON learning_stickies(domain);
  CREATE INDEX IF NOT EXISTS idx_learning_stickies_created_at ON learning_stickies(created_at);
`;

/**
 * Migration to add user_id to learning_stickies if missing (for existing tables)
 */
export const MIGRATE_LEARNING_STICKIES_USER_ID = `
  DO $$ 
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'learning_stickies' AND column_name = 'user_id'
    ) THEN
      ALTER TABLE learning_stickies ADD COLUMN user_id VARCHAR(255);
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'learning_stickies' AND column_name = 'user_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_learning_stickies_user_id ON learning_stickies(user_id);
    END IF;
  END $$;
`;

/**
 * Migration: add domain column and allow nullable ingestion_id for domain-generated stickies
 */
export const MIGRATE_LEARNING_STICKIES_DOMAIN = `
  DO $$ 
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'learning_stickies' AND column_name = 'domain'
    ) THEN
      ALTER TABLE learning_stickies ADD COLUMN domain VARCHAR(500);
      CREATE INDEX IF NOT EXISTS idx_learning_stickies_domain ON learning_stickies(domain);
    END IF;
    -- Allow ingestion_id to be null (for domain-generated stickies)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'learning_stickies' AND column_name = 'ingestion_id'
    ) THEN
      ALTER TABLE learning_stickies ALTER COLUMN ingestion_id DROP NOT NULL;
    END IF;
  END $$;
`;
