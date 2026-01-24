/**
 * GET /api/tasks/:ingestionId
 * Get all tasks for a specific ingestion ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTasksByIngestionId } from '@/lib/db/tasks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { ingestionId: string } }
) {
  try {
    const { ingestionId } = params;

    if (!ingestionId) {
      return NextResponse.json(
        { error: 'Ingestion ID is required' },
        { status: 400 }
      );
    }

    const tasks = await getTasksByIngestionId(ingestionId);

    return NextResponse.json({
      ingestionId,
      tasks: tasks.map((task) => ({
        id: task.id,
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
