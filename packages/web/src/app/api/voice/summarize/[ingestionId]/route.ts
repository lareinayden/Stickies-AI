/**
 * POST /api/voice/summarize/:ingestionId
 * Summarize a completed transcription into tasks and reminders
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTranscriptionByIngestionId } from '@/lib/db/transcriptions';
import { createTasks } from '@/lib/db/tasks';
import { createTaskSummarizer } from '@/lib/llm/task-summarizer';
import { requireAuth } from '@/lib/auth/middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { ingestionId: string } }
) {
  try {
    // Get authenticated user
    const userId = await requireAuth(request);
    
    const { ingestionId } = params;

    if (!ingestionId) {
      return NextResponse.json(
        { error: 'Ingestion ID is required' },
        { status: 400 }
      );
    }

    // Get transcription
    const transcription = await getTranscriptionByIngestionId(userId, ingestionId);

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    // Check if transcription is completed
    if (transcription.status !== 'completed') {
      return NextResponse.json(
        {
          error: 'Transcription is not completed yet',
          status: transcription.status,
        },
        { status: 400 }
      );
    }

    // Check if transcript exists
    const transcript = transcription.transcript;
    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript available for summarization' },
        { status: 400 }
      );
    }

    // Summarize transcript using LLM
    const summarizer = createTaskSummarizer();
    const summary = await summarizer.summarizeTranscript(transcript);

    // Parse due dates with correction for "tomorrow" and "day after tomorrow" references
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayAfterTomorrowStr = dayAfterTomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const tasksWithDates = summary.tasks.map((task) => {
      let parsedDate: Date | null = null;
      
      if (task.dueDate) {
        // Check if the date string contains relative date references and correct if needed
        const dateStr = task.dueDate.toLowerCase();
        const transcriptLower = transcript.toLowerCase();
        const dateMatch = task.dueDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
        
        // Correct dates based on transcript content
        if (dateMatch) {
          const llmDate = new Date(parseInt(dateMatch[1], 10), parseInt(dateMatch[2], 10) - 1, parseInt(dateMatch[3], 10));
          const daysFromToday = Math.round((llmDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          // Extract time from LLM's date
          const timeMatch = task.dueDate.match(/T(\d{2}):(\d{2}):(\d{2})/);
          const hours = timeMatch ? parseInt(timeMatch[1], 10) : 0;
          const minutes = timeMatch ? parseInt(timeMatch[2], 10) : 0;
          const seconds = timeMatch ? parseInt(timeMatch[3], 10) : 0;
          
          // Correct "day after tomorrow" - should be 2 days from today
          if ((transcriptLower.includes('day after tomorrow') || transcriptLower.includes('the day after tomorrow')) && daysFromToday !== 2) {
            console.log(
              `Correcting date for task "${task.title}": ` +
              `LLM returned ${task.dueDate} (${daysFromToday} days away), correcting to day after tomorrow (${dayAfterTomorrowStr})`
            );
            parsedDate = new Date(dayAfterTomorrow);
            parsedDate.setHours(hours, minutes, seconds, 0);
          }
          // Correct "tomorrow" - should be 1 day from today
          else if (transcriptLower.includes('tomorrow') && !transcriptLower.includes('day after') && daysFromToday !== 1) {
            console.log(
              `Correcting date for task "${task.title}": ` +
              `LLM returned ${task.dueDate} (${daysFromToday} days away), correcting to tomorrow (${tomorrowStr})`
            );
            parsedDate = new Date(tomorrow);
            parsedDate.setHours(hours, minutes, seconds, 0);
          } else {
            parsedDate = summarizer.parseDueDate(task.dueDate);
          }
        } else {
          parsedDate = summarizer.parseDueDate(task.dueDate);
        }
        
        // Log for debugging if date seems incorrect
        if (parsedDate) {
          const daysDiff = Math.round((parsedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          // Warn if date is more than 2 years in the past or future
          if (daysDiff < -730 || daysDiff > 730) {
            console.warn(
              `Unusual date parsed for task "${task.title}": ` +
              `LLM returned "${task.dueDate}", parsed to ${parsedDate.toISOString()} ` +
              `(${daysDiff} days from now)`
            );
          }
        } else {
          console.warn(
            `Could not parse date "${task.dueDate}" for task "${task.title}"`
          );
        }
      }
      
      return {
        title: task.title,
        description: task.description || null,
        type: task.type || 'task',
        priority: task.priority || null,
        dueDate: parsedDate,
        metadata: {
          originalDueDateString: task.dueDate || null,
        },
      };
    });

    // Create tasks in database
    const createdTasks = await createTasks(
      userId,
      transcription.id,
      ingestionId,
      tasksWithDates
    );

    return NextResponse.json({
      ingestionId,
      transcriptionId: transcription.id,
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
    console.error('Summarization error:', error);
    
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
            : 'An error occurred while summarizing transcript',
      },
      { status: 500 }
    );
  }
}
