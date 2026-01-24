/**
 * GET /api/tasks
 * Get all tasks with optional filters
 * 
 * Query parameters:
 * - completed: boolean (filter by completion status)
 * - type: 'task' | 'reminder' | 'note' (filter by type)
 * - priority: 'low' | 'medium' | 'high' (filter by priority)
 * - limit: number (limit results)
 * - offset: number (pagination offset)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTasks } from '@/lib/db/tasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters: {
      completed?: boolean;
      type?: 'task' | 'reminder' | 'note';
      priority?: 'low' | 'medium' | 'high';
      limit?: number;
      offset?: number;
    } = {};

    if (searchParams.has('completed')) {
      filters.completed = searchParams.get('completed') === 'true';
    }

    if (searchParams.has('type')) {
      const type = searchParams.get('type');
      if (['task', 'reminder', 'note'].includes(type || '')) {
        filters.type = type as 'task' | 'reminder' | 'note';
      }
    }

    if (searchParams.has('priority')) {
      const priority = searchParams.get('priority');
      if (['low', 'medium', 'high'].includes(priority || '')) {
        filters.priority = priority as 'low' | 'medium' | 'high';
      }
    }

    if (searchParams.has('limit')) {
      const limit = parseInt(searchParams.get('limit') || '0', 10);
      if (limit > 0) {
        filters.limit = limit;
      }
    }

    if (searchParams.has('offset')) {
      const offset = parseInt(searchParams.get('offset') || '0', 10);
      if (offset >= 0) {
        filters.offset = offset;
      }
    }

    const tasks = await getTasks(filters);

    return NextResponse.json({
      tasks: tasks.map((task) => ({
        id: task.id,
        transcriptionId: task.transcription_id,
        ingestionId: task.ingestion_id,
        title: task.title,
        description: task.description,
        type: task.type,
        priority: task.priority,
        dueDate: task.due_date?.toISOString() || null,
        completed: task.completed,
        completedAt: task.completed_at?.toISOString() || null,
        createdAt: task.created_at.toISOString(),
        metadata: task.metadata,
      })),
      count: tasks.length,
    });
  } catch (error) {
    console.error('Task retrieval error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while retrieving tasks',
      },
      { status: 500 }
    );
  }
}
