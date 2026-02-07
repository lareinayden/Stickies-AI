/**
 * POST /api/tasks/from-text
 * Extract tasks from typed text (no voice). Uses same LLM as transcript summarization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createTaskSummarizer } from '@/lib/llm/task-summarizer';
import { createTasksFromText } from '@/lib/db/tasks';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const body = await request.json().catch(() => ({}));
    const text = typeof body.text === 'string' ? body.text.trim() : '';

    if (!text) {
      return NextResponse.json(
        { error: 'Request body must include "text": a string describing tasks or reminders.' },
        { status: 400 }
      );
    }

    const summarizer = createTaskSummarizer();
    const summary = await summarizer.summarizeTranscript(text);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dayAfterTomorrowStr = dayAfterTomorrow.toISOString().split('T')[0];
    const textLower = text.toLowerCase();

    const tasksWithDates = summary.tasks.map((task) => {
      let parsedDate: Date | null = null;
      if (task.dueDate) {
        const dateMatch = task.dueDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
          const llmDate = new Date(
            parseInt(dateMatch[1], 10),
            parseInt(dateMatch[2], 10) - 1,
            parseInt(dateMatch[3], 10)
          );
          const daysFromToday = Math.round(
            (llmDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          const timeMatch = task.dueDate.match(/T(\d{2}):(\d{2}):(\d{2})/);
          const hours = timeMatch ? parseInt(timeMatch[1], 10) : 0;
          const minutes = timeMatch ? parseInt(timeMatch[2], 10) : 0;
          const seconds = timeMatch ? parseInt(timeMatch[3], 10) : 0;
          if (
            (textLower.includes('day after tomorrow') ||
              textLower.includes('the day after tomorrow')) &&
            daysFromToday !== 2
          ) {
            parsedDate = new Date(dayAfterTomorrow);
            parsedDate.setHours(hours, minutes, seconds, 0);
          } else if (
            textLower.includes('tomorrow') &&
            !textLower.includes('day after') &&
            daysFromToday !== 1
          ) {
            parsedDate = new Date(tomorrow);
            parsedDate.setHours(hours, minutes, seconds, 0);
          } else {
            parsedDate = summarizer.parseDueDate(task.dueDate);
          }
        } else {
          parsedDate = summarizer.parseDueDate(task.dueDate);
        }
      }
      return {
        title: task.title,
        description: task.description || null,
        type: task.type || 'task',
        priority: task.priority || null,
        dueDate: parsedDate,
        metadata: { originalDueDateString: task.dueDate || null },
      };
    });

    const ingestionId = `text:${randomUUID()}`;
    const createdTasks = await createTasksFromText(userId, ingestionId, tasksWithDates);

    return NextResponse.json({
      ingestionId,
      tasksCreated: createdTasks.length,
      tasks: createdTasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        type: task.type,
        priority: task.priority,
        dueDate: task.due_date?.toISOString() || null,
        completed: task.completed,
        createdAt: task.created_at.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Tasks from text error:', error);
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
            : 'An error occurred while extracting tasks',
      },
      { status: 500 }
    );
  }
}
