/**
 * POST /api/learning-tasks/generate
 *
 * Called on iOS app open and when a user enables a schedule for a domain.
 * For each learning area that is due for a review, uses the LLM to generate a
 * natural, timed review task (e.g. "Study React Hooks at 9 AM") and saves it
 * to the Tasks tab.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getDomains } from '@/lib/db/learning-stickies';
import { getLearningStickies } from '@/lib/db/learning-stickies';
import {
  getLearningTaskSettings,
  updateLastGeneratedAt,
} from '@/lib/db/learning-task-settings';
import { createTasksFromText } from '@/lib/db/tasks';
import { createTaskSummarizer } from '@/lib/llm/task-summarizer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Returns today at 9:00 AM local time as a fallback due date */
function nineAmToday(): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth(request);

    const [domains, settings] = await Promise.all([
      getDomains(userId),
      getLearningTaskSettings(userId),
    ]);

    // Build a map of domain → setting for O(1) lookup
    const settingsByDomain = new Map(settings.map((s) => [s.domain, s]));

    const now = new Date();
    const generatedTasks = [];

    // Try to create the summarizer — may fail if OPENAI_API_KEY is not set
    let summarizer: ReturnType<typeof createTaskSummarizer> | null = null;
    try {
      summarizer = createTaskSummarizer();
    } catch (_) {
      // No LLM available — will fall back to simple task titles below
    }

    for (const { domain } of domains) {
      const setting = settingsByDomain.get(domain);
      if (!setting || setting.frequency_days === 0) continue;

      // Check if this domain is due for a new review task
      const isDue =
        setting.last_generated_at === null ||
        new Date(setting.last_generated_at.getTime() + setting.frequency_days * 86_400_000) <= now;

      if (!isDue) continue;

      // Default values used when LLM is unavailable or returns nothing
      let taskTitle = `Review ${domain}`;
      let taskDescription: string | null = null;
      const dueDate = nineAmToday();

      if (summarizer) {
        try {
          // Fetch up to 3 concepts to give the LLM context
          const stickies = await getLearningStickies(userId, { domain, limit: 3 });
          const concepts = stickies.map((s) => s.concept).filter(Boolean);
          const conceptsText = concepts.length > 0 ? `Focus on: ${concepts.join(', ')}.` : '';
          const prompt = `Add a review task for today at 9am: study ${domain}. ${conceptsText}`;

          const { tasks: llmTasks } = await summarizer.summarizeTranscript(prompt);
          const llmTask = llmTasks[0];

          if (llmTask) {
            taskTitle = llmTask.title;
            taskDescription = llmTask.description ?? null;
            if (llmTask.dueDate) {
              const parsed = summarizer.parseDueDate(llmTask.dueDate);
              if (parsed) dueDate.setTime(parsed.getTime());
            }
          }
        } catch (_) {
          // LLM failed — keep the simple fallback title/time set above
        }
      }

      const ingestionId = `learning:${encodeURIComponent(domain)}`;
      const [task] = await createTasksFromText(userId, ingestionId, [
        {
          title: taskTitle,
          description: taskDescription,
          type: 'task',
          priority: 'medium',
          dueDate,
        },
      ]);

      await updateLastGeneratedAt(userId, domain, now);

      generatedTasks.push({
        id: task.id,
        title: task.title,
        description: task.description,
        type: task.type,
        priority: task.priority,
        dueDate: task.due_date?.toISOString() ?? null,
        createdAt: task.created_at.toISOString(),
      });
    }

    return NextResponse.json({ generatedTasks, count: generatedTasks.length });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate tasks' },
      { status: 500 }
    );
  }
}
