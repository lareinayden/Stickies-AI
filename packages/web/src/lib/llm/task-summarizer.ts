/**
 * LLM service for summarizing transcripts into tasks and reminders
 */

import OpenAI from 'openai';
import type { TaskRecord } from '../db/schema';

export interface TaskSummary {
  tasks: Array<{
    title: string;
    description?: string;
    type: 'task' | 'reminder' | 'note';
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string; // ISO date string or relative date like "tomorrow", "next week"
  }>;
}

export interface TaskSummarizerConfig {
  apiKey: string;
  model?: string; // Default: 'gpt-4o-mini' for cost efficiency
  temperature?: number; // Default: 0.3 for consistent structured output
}

export class TaskSummarizer {
  private client: OpenAI;
  private model: string;
  private temperature: number;

  constructor(config: TaskSummarizerConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: 30000, // 30 seconds
    });

    this.model = config.model || 'gpt-4o-mini';
    this.temperature = config.temperature ?? 0.3;
  }

  /**
   * Summarize a transcript into structured tasks and reminders
   */
  async summarizeTranscript(transcript: string): Promise<TaskSummary> {
    // Get current date information for context
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayAfterTomorrowStr = dayAfterTomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentDateStr = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const systemPrompt = `You are a helpful assistant that extracts tasks, reminders, and notes from voice transcripts. 
Analyze the transcript and extract actionable items. Return a JSON object with a "tasks" array.

Each task should have:
- title: A clear, concise title (required)
- description: Optional detailed description
- type: One of "task", "reminder", or "note"
- priority: One of "low", "medium", "high" (optional)
- dueDate: ISO 8601 date string in local timezone (e.g., "2024-01-24T10:00:00" for 10am), or null if no date mentioned

CRITICAL DATE CONTEXT:
- TODAY is ${currentDateStr} (${todayStr})
- TOMORROW is ${tomorrowStr}
- DAY AFTER TOMORROW is ${dayAfterTomorrowStr}
- When the transcript says "tomorrow", use the date: ${tomorrowStr}
- When the transcript says "day after tomorrow" or "the day after tomorrow", use the date: ${dayAfterTomorrowStr}
- When the transcript says "today", use the date: ${todayStr}

IMPORTANT DATE FORMATTING RULES:
- Always return dates in ISO 8601 format: "YYYY-MM-DDTHH:MM:SS" (without Z, meaning local time)
- DO NOT use UTC timezone (no Z suffix) - times should be in the user's local timezone
- If a time is mentioned (e.g., "10am", "3pm"), use that exact time in 24-hour format (10am = 10:00, 3pm = 15:00)
- If only a date is mentioned without time, use 00:00:00 for the time
- For "tomorrow", ALWAYS use ${tomorrowStr}
- For "day after tomorrow" or "the day after tomorrow", ALWAYS use ${dayAfterTomorrowStr}
- For relative dates like "next Monday", calculate from ${todayStr}
- Examples:
  * "tomorrow 10am" should be "${tomorrowStr}T10:00:00"
  * "day after tomorrow 3pm" should be "${dayAfterTomorrowStr}T15:00:00"

Guidelines:
- Extract only actionable items (tasks, reminders, notes)
- If the transcript is just a conversation without tasks, return an empty tasks array
- Be concise but clear
- Infer priority from context (urgent words, deadlines, etc.)
- Parse dates and times mentioned in the transcript accurately
- Group related items if they're part of the same task
- Return valid JSON only, no markdown formatting`;

    const userPrompt = `Please extract tasks and reminders from this voice transcript:

${transcript}

Return a JSON object with this structure:
{
  "tasks": [
    {
      "title": "Task title",
      "description": "Optional description",
      "type": "task",
      "priority": "medium",
      "dueDate": "2024-01-24T10:00:00"
    }
  ]
}

Remember: dueDate must be in ISO 8601 format (YYYY-MM-DDTHH:MM:SS) WITHOUT the Z suffix, so times are interpreted as local time, not UTC.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: this.temperature,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from LLM');
      }

      // Parse JSON response
      const parsed = JSON.parse(content) as TaskSummary;

      // Validate structure
      if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
        throw new Error('Invalid response format: missing tasks array');
      }

      // Validate each task
      for (const task of parsed.tasks) {
        if (!task.title || typeof task.title !== 'string') {
          throw new Error('Invalid task: missing or invalid title');
        }
        if (task.type && !['task', 'reminder', 'note'].includes(task.type)) {
          throw new Error(`Invalid task type: ${task.type}`);
        }
        if (
          task.priority &&
          !['low', 'medium', 'high'].includes(task.priority)
        ) {
          throw new Error(`Invalid priority: ${task.priority}`);
        }
      }

      return parsed;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Failed to parse LLM response as JSON: ${error.message}`);
      }
      if (error instanceof Error) {
        throw new Error(`LLM summarization failed: ${error.message}`);
      }
      throw new Error('Unknown error during LLM summarization');
    }
  }

  /**
   * Parse date strings to actual Date objects
   * Handles ISO 8601 dates, relative dates, and dates with times
   */
  parseDueDate(dateString: string | undefined): Date | null {
    if (!dateString) {
      return null;
    }

    const trimmed = dateString.trim();
    const lowerDate = trimmed.toLowerCase();

    // Try parsing as ISO date first (most common case from LLM)
    // If it's a valid ISO date, extract components and create in local timezone
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z?$/);
    if (isoMatch) {
      // Extract date and time components
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1; // JavaScript months are 0-indexed
      const day = parseInt(isoMatch[3], 10);
      const hours = parseInt(isoMatch[4], 10);
      const minutes = parseInt(isoMatch[5], 10);
      const seconds = parseInt(isoMatch[6], 10);

      // Validate date components
      const now = new Date();
      const yearDiff = year - now.getFullYear();
      
      // Accept dates within reasonable range (current year ± 2 years)
      if (yearDiff >= -2 && yearDiff <= 2) {
        // Create date in LOCAL timezone (not UTC)
        // This ensures "10:00" means 10am local time, not 10am UTC
        const localDate = new Date(year, month, day, hours, minutes, seconds);
        
        // Validate the date is valid
        if (!isNaN(localDate.getTime())) {
          return localDate;
        }
      }
    }

    // Fallback: try standard Date parsing (for other formats)
    const fallbackDate = new Date(trimmed);
    if (!isNaN(fallbackDate.getTime())) {
      const now = new Date();
      const yearDiff = fallbackDate.getFullYear() - now.getFullYear();
      if (yearDiff >= -2 && yearDiff <= 2) {
        // If it's a UTC date string, we might need to adjust
        // But for now, return as-is and log
        console.warn(`Parsed date (fallback): ${trimmed} -> ${fallbackDate.toISOString()}`);
        return fallbackDate;
      }
    }

    // Parse relative dates with time extraction
    const now = new Date();

    // Extract time from string (e.g., "10am", "3pm", "14:30")
    let hours = 0;
    let minutes = 0;
    
    // Match 12-hour format: "10am", "3pm", "10:30am", etc.
    const time12Match = lowerDate.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
    if (time12Match) {
      hours = parseInt(time12Match[1], 10);
      minutes = time12Match[2] ? parseInt(time12Match[2], 10) : 0;
      if (time12Match[3] === 'pm' && hours !== 12) {
        hours += 12;
      } else if (time12Match[3] === 'am' && hours === 12) {
        hours = 0;
      }
    } else {
      // Match 24-hour format: "14:30", "10:00"
      const time24Match = lowerDate.match(/(\d{1,2}):(\d{2})/);
      if (time24Match) {
        hours = parseInt(time24Match[1], 10);
        minutes = parseInt(time24Match[2], 10);
      }
    }

    // Parse relative dates
    if (lowerDate.includes('today')) {
      const today = new Date(now);
      today.setHours(hours, minutes, 0, 0);
      // If no time was specified, default to end of day
      if (!time12Match && !time24Match) {
        today.setHours(23, 59, 59, 999);
      }
      return today;
    }

    // Check for "day after tomorrow" first (more specific)
    if (lowerDate.includes('day after tomorrow') || lowerDate.includes('the day after tomorrow')) {
      const dayAfterTomorrow = new Date(now);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      dayAfterTomorrow.setHours(hours, minutes, 0, 0);
      // If no time was specified, default to end of day
      if (!time12Match && !time24Match) {
        dayAfterTomorrow.setHours(23, 59, 59, 999);
      }
      return dayAfterTomorrow;
    }

    if (lowerDate.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(hours, minutes, 0, 0);
      // If no time was specified, default to end of day
      if (!time12Match && !time24Match) {
        tomorrow.setHours(23, 59, 59, 999);
      }
      return tomorrow;
    }

    if (lowerDate.includes('next week')) {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(hours, minutes, 0, 0);
      if (!time12Match && !time24Match) {
        nextWeek.setHours(23, 59, 59, 999);
      }
      return nextWeek;
    }

    // Try to extract number of days
    const daysMatch = lowerDate.match(/(\d+)\s*days?/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10);
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + days);
      futureDate.setHours(hours, minutes, 0, 0);
      if (!time12Match && !time24Match) {
        futureDate.setHours(23, 59, 59, 999);
      }
      return futureDate;
    }

    // If we can't parse it, return null
    console.warn(`Could not parse date: ${dateString}`);
    return null;
  }
}

/**
 * Create a TaskSummarizer instance from environment variables
 */
export function createTaskSummarizer(): TaskSummarizer {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY environment variable is not set. Please set it in your .env file.'
    );
  }

  return new TaskSummarizer({
    apiKey,
    model: process.env.TASK_SUMMARIZER_MODEL || 'gpt-4o-mini',
    temperature: parseFloat(process.env.TASK_SUMMARIZER_TEMPERATURE || '0.3'),
  });
}
