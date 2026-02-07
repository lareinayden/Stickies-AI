/**
 * Shared types for Stickies AI iOS app
 */

export interface Task {
  id: string;
  title: string;
  description: string | null;
  type: 'task' | 'reminder' | 'note';
  priority: 'low' | 'medium' | 'high' | null;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  ingestionId?: string;
}

export interface UploadResult {
  ingestionId: string;
  status: 'completed' | 'processing' | 'pending' | 'failed';
  message?: string;
  error?: string;
}

export interface TranscriptResult {
  ingestionId: string;
  status: string;
  transcript: string | null;
  language?: string;
  segments?: Array<{ start: number; end: number; text: string }>;
}

export interface SummarizeResult {
  ingestionId: string;
  transcriptionId: string;
  tasksCreated: number;
  tasks: Task[];
}

export interface LearningSticky {
  id: string;
  transcriptionId: string | null;
  ingestionId: string | null;
  domain: string | null;
  concept: string;
  definition: string;
  example: string | null;
  relatedTerms: string[];
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export const MOCK_USERS = [
  { id: 'shirley', username: 'shirley', displayName: 'Shirley' },
  { id: 'yixiao', username: 'yixiao', displayName: 'Yixiao' },
  { id: 'guest', username: 'guest', displayName: 'Guest' },
] as const;

export type MockUserId = (typeof MOCK_USERS)[number]['id'];
