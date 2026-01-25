/**
 * GET /api/task/:taskId
 * Get a specific task by ID
 * 
 * PATCH /api/task/:taskId
 * Update a task (e.g., mark as completed, update fields)
 * 
 * DELETE /api/task/:taskId
 * Delete a task
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getTaskById,
  updateTask,
  updateTaskCompletion,
  deleteTask,
} from '@/lib/db/tasks';
import { requireAuth } from '@/lib/auth/middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    // Get authenticated user
    const userId = await requireAuth(request);
    
    const { taskId } = params;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const task = await getTaskById(userId, taskId);

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Task retrieval error:', error);
    
    // Handle authentication errors
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while retrieving task',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    // Get authenticated user
    const userId = await requireAuth(request);
    
    const { taskId } = params;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Handle completion status update
    if (body.completed !== undefined) {
      const task = await updateTaskCompletion(userId, taskId, body.completed);
      return NextResponse.json({
        id: task.id,
        title: task.title,
        description: task.description,
        type: task.type,
        priority: task.priority,
        dueDate: task.due_date?.toISOString() || null,
        completed: task.completed,
        completedAt: task.completed_at?.toISOString() || null,
        createdAt: task.created_at.toISOString(),
      });
    }

    // Handle other field updates
    const updates: {
      title?: string;
      description?: string | null;
      type?: 'task' | 'reminder' | 'note';
      priority?: 'low' | 'medium' | 'high' | null;
      dueDate?: Date | null;
    } = {};

    if (body.title !== undefined) {
      updates.title = body.title;
    }

    if (body.description !== undefined) {
      updates.description = body.description;
    }

    if (body.type !== undefined) {
      updates.type = body.type;
    }

    if (body.priority !== undefined) {
      updates.priority = body.priority;
    }

    if (body.dueDate !== undefined) {
      updates.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    const task = await updateTask(userId, taskId, updates);

    return NextResponse.json({
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      priority: task.priority,
      dueDate: task.due_date?.toISOString() || null,
      completed: task.completed,
      completedAt: task.completed_at?.toISOString() || null,
      createdAt: task.created_at.toISOString(),
    });
  } catch (error) {
    console.error('Task update error:', error);
    
    // Handle authentication errors
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while updating task',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    // Get authenticated user
    const userId = await requireAuth(request);
    
    const { taskId } = params;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const deleted = await deleteTask(userId, taskId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Task deleted successfully',
      taskId,
    });
  } catch (error) {
    console.error('Task deletion error:', error);
    
    // Handle authentication errors
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while deleting task',
      },
      { status: 500 }
    );
  }
}
