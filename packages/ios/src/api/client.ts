/**
 * API client for Stickies AI web backend
 * Uses X-User-Id for auth (mock users).
 */

import type { LearningSticky } from '../types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

function headers(userId: string, contentType?: string): Record<string, string> {
  const h: Record<string, string> = {
    'X-User-Id': userId,
  };
  if (contentType) {
    h['Content-Type'] = contentType;
  }
  return h;
}

export async function trackEvent(
  userId: string,
  eventType: string,
  metadata?: Record<string, unknown> | null
): Promise<{ id: string; eventType: string; occurredAt: string }> {
  const res = await fetch(`${BASE_URL}/api/events`, {
    method: 'POST',
    headers: headers(userId, 'application/json'),
    body: JSON.stringify({
      event_type: eventType,
      metadata: metadata ?? null,
    }),
  });

  const json = (await res.json()) as {
    id?: string;
    eventType?: string;
    occurredAt?: string;
    error?: string;
  };

  if (!res.ok) throw new Error(json.error || `Track event failed: ${res.status}`);
  if (!json.id || !json.eventType || !json.occurredAt) {
    throw new Error('Invalid track event response');
  }

  return { id: json.id, eventType: json.eventType, occurredAt: json.occurredAt };
}

export async function trackStickyReview(
  userId: string,
  payload: { stickyId: string; domain?: string | null; status: 'needs_review' | 'learned' }
): Promise<void> {
  await trackEvent(userId, 'sticky_reviewed', {
    stickyId: payload.stickyId,
    domain: payload.domain ?? null,
    status: payload.status,
  });
}

export async function getRewardsDailyStats(
  userId: string,
  days = 30
): Promise<{
  days: number;
  stats: Array<{ date: string; effortScore: number; tasksCompleted: number; reviewsCompleted: number }>;
}> {
  const res = await fetch(`${BASE_URL}/api/rewards/daily-stats?days=${encodeURIComponent(String(days))}`, {
    headers: headers(userId),
  });
  const json = (await res.json()) as {
    days?: number;
    stats?: Array<{ date: string; effortScore: number; tasksCompleted: number; reviewsCompleted: number }>;
    error?: string;
  };
  if (!res.ok) throw new Error(json.error || `Get rewards daily-stats failed: ${res.status}`);
  return { days: json.days ?? days, stats: json.stats ?? [] };
}

export async function getRewardsWeeklyReport(
  userId: string
): Promise<{
  startDate: string;
  endDate: string;
  days: number;
  activeDays: number;
  totalTasks: number;
  totalReviews: number;
  averageEffort: number;
  bestDay: { date: string; effortScore: number } | null;
}> {
  const res = await fetch(`${BASE_URL}/api/rewards/weekly-report`, {
    headers: headers(userId),
  });
  const json = (await res.json()) as {
    startDate?: string;
    endDate?: string;
    days?: number;
    activeDays?: number;
    totalTasks?: number;
    totalReviews?: number;
    averageEffort?: number;
    bestDay?: { date: string; effortScore: number } | null;
    error?: string;
  };
  if (!res.ok) throw new Error(json.error || `Get rewards weekly-report failed: ${res.status}`);
  return {
    startDate: json.startDate ?? '',
    endDate: json.endDate ?? '',
    days: json.days ?? 7,
    activeDays: json.activeDays ?? 0,
    totalTasks: json.totalTasks ?? 0,
    totalReviews: json.totalReviews ?? 0,
    averageEffort: json.averageEffort ?? 0,
    bestDay: json.bestDay ?? null,
  };
}

export async function getRewardsHighlights(
  userId: string
): Promise<{ highlights: Array<Record<string, unknown>> }> {
  const res = await fetch(`${BASE_URL}/api/rewards/highlights`, {
    headers: headers(userId),
  });
  const json = (await res.json()) as { highlights?: Array<Record<string, unknown>>; error?: string };
  if (!res.ok) throw new Error(json.error || `Get rewards highlights failed: ${res.status}`);
  return { highlights: json.highlights ?? [] };
}

export async function getRewardsUnlocks(
  userId: string
): Promise<{
  unlocks: Array<{ id: string; type: string; isEnabled: boolean; earnedAt: string; metadata: unknown }>;
}> {
  const res = await fetch(`${BASE_URL}/api/rewards/unlocks`, {
    headers: headers(userId),
  });
  const json = (await res.json()) as {
    unlocks?: Array<{ id: string; type: string; isEnabled: boolean; earnedAt: string; metadata: unknown }>;
    error?: string;
  };
  if (!res.ok) throw new Error(json.error || `Get rewards unlocks failed: ${res.status}`);
  return { unlocks: json.unlocks ?? [] };
}

export async function getRewardsProductivity(userId: string): Promise<{
  peakWindow: {
    startHour: number;
    endHour: number;
    label: string;
    activityCount: number;
    notificationHour: number;
    notificationMinute: number;
  } | null;
  insight: string;
  activityByHour?: Array<{ hour: number; count: number }>;
}> {
  const res = await fetch(`${BASE_URL}/api/rewards/productivity`, {
    headers: headers(userId),
  });
  const json = (await res.json()) as {
    peakWindow?: {
      startHour: number;
      endHour: number;
      label: string;
      activityCount: number;
      notificationHour: number;
      notificationMinute: number;
    } | null;
    insight?: string;
    activityByHour?: Array<{ hour: number; count: number }>;
    error?: string;
  };
  if (!res.ok) throw new Error(json.error || `Get rewards productivity failed: ${res.status}`);
  return {
    peakWindow: json.peakWindow ?? null,
    insight: json.insight ?? 'Complete more tasks and reviews to unlock your productivity insight.',
    activityByHour: json.activityByHour,
  };
}

export async function uploadVoice(
  userId: string,
  uri: string,
  language = 'en'
): Promise<{ ingestionId: string; status: string; error?: string }> {
  const formData = new FormData();
  const name = uri.split('/').pop() || 'recording.m4a';
  formData.append('file', {
    uri,
    name,
    type: 'audio/mp4',
  } as unknown as Blob);
  formData.append('language', language);

  const res = await fetch(`${BASE_URL}/api/voice/upload`, {
    method: 'POST',
    headers: {
      'X-User-Id': userId,
    },
    body: formData,
  });

  const json = (await res.json()) as {
    ingestionId?: string;
    status?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(json.error || `Upload failed: ${res.status}`);
  }
  if (!json.ingestionId) {
    throw new Error('No ingestionId in response');
  }
  return {
    ingestionId: json.ingestionId,
    status: json.status || 'unknown',
    error: json.error,
  };
}

export async function getStatus(
  userId: string,
  ingestionId: string
): Promise<{ status: string }> {
  const res = await fetch(
    `${BASE_URL}/api/voice/status/${encodeURIComponent(ingestionId)}`,
    { headers: headers(userId) }
  );
  const json = (await res.json()) as { status?: string; error?: string };
  if (!res.ok) throw new Error(json.error || `Status failed: ${res.status}`);
  return { status: json.status || 'unknown' };
}

export async function getTranscript(
  userId: string,
  ingestionId: string
): Promise<{
  status: string;
  transcript: string | null;
  language?: string;
  segments?: Array<{ start: number; end: number; text: string }>;
}> {
  const res = await fetch(
    `${BASE_URL}/api/voice/transcript/${encodeURIComponent(ingestionId)}`,
    { headers: headers(userId) }
  );
  const json = (await res.json()) as {
    status?: string;
    transcript?: string | null;
    language?: string;
    segments?: Array<{ start: number; end: number; text: string }>;
    error?: string;
  };
  if (!res.ok && res.status !== 202) {
    throw new Error(json.error || `Transcript failed: ${res.status}`);
  }
  return {
    status: json.status || 'unknown',
    transcript: json.transcript ?? null,
    language: json.language,
    segments: json.segments,
  };
}

export async function summarizeTranscript(
  userId: string,
  ingestionId: string
): Promise<{
  ingestionId: string;
  transcriptionId: string;
  tasksCreated: number;
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    type: string;
    priority: string | null;
    dueDate: string | null;
    completed: boolean;
    createdAt: string;
  }>;
}> {
  const res = await fetch(
    `${BASE_URL}/api/voice/summarize/${encodeURIComponent(ingestionId)}`,
    {
      method: 'POST',
      headers: headers(userId, 'application/json'),
    }
  );
  const json = (await res.json()) as {
    ingestionId?: string;
    transcriptionId?: string;
    tasksCreated?: number;
    tasks?: Array<{
      id: string;
      title: string;
      description: string | null;
      type: string;
      priority: string | null;
      dueDate: string | null;
      completed: boolean;
      createdAt: string;
    }>;
    error?: string;
  };
  if (!res.ok) throw new Error(json.error || `Summarize failed: ${res.status}`);
  return {
    ingestionId: json.ingestionId!,
    transcriptionId: json.transcriptionId!,
    tasksCreated: json.tasksCreated ?? 0,
    tasks: json.tasks ?? [],
  };
}

export async function getTasks(userId: string): Promise<{
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    type: string;
    priority: string | null;
    dueDate: string | null;
    completed: boolean;
    completedAt: string | null;
    createdAt: string;
    ingestionId?: string;
  }>;
  count: number;
}> {
  const res = await fetch(`${BASE_URL}/api/tasks`, {
    headers: headers(userId),
  });
  const json = (await res.json()) as {
    tasks?: Array<{
      id: string;
      title: string;
      description: string | null;
      type: string;
      priority: string | null;
      dueDate: string | null;
      completed: boolean;
      completedAt: string | null;
      createdAt: string;
      ingestionId?: string;
    }>;
    count?: number;
    error?: string;
  };
  if (!res.ok) throw new Error(json.error || `Tasks failed: ${res.status}`);
  return {
    tasks: json.tasks ?? [],
    count: json.count ?? 0,
  };
}

export async function createTasksFromText(
  userId: string,
  text: string
): Promise<{
  tasksCreated: number;
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    type: string;
    priority: string | null;
    dueDate: string | null;
    completed: boolean;
    createdAt: string;
  }>;
}> {
  const res = await fetch(`${BASE_URL}/api/tasks/from-text`, {
    method: 'POST',
    headers: headers(userId, 'application/json'),
    body: JSON.stringify({ text: text.trim() }),
  });
  const json = (await res.json()) as {
    tasksCreated?: number;
    tasks?: Array<{
      id: string;
      title: string;
      description: string | null;
      type: string;
      priority: string | null;
      dueDate: string | null;
      completed: boolean;
      createdAt: string;
    }>;
    error?: string;
  };
  if (!res.ok) throw new Error(json.error || `Tasks from text failed: ${res.status}`);
  return {
    tasksCreated: json.tasksCreated ?? 0,
    tasks: json.tasks ?? [],
  };
}

export async function updateTask(
  userId: string,
  taskId: string,
  patch: { completed?: boolean }
): Promise<{
  id: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
}> {
  const res = await fetch(
    `${BASE_URL}/api/task/${encodeURIComponent(taskId)}`,
    {
      method: 'PATCH',
      headers: headers(userId, 'application/json'),
      body: JSON.stringify(patch),
    }
  );
  const json = (await res.json()) as {
    id?: string;
    title?: string;
    completed?: boolean;
    completedAt?: string | null;
    error?: string;
  };
  if (!res.ok) throw new Error(json.error || `Update task failed: ${res.status}`);
  return {
    id: json.id!,
    title: json.title!,
    completed: json.completed ?? false,
    completedAt: json.completedAt ?? null,
  };
}

export type TaskPatch = {
  title?: string;
  description?: string | null;
  type?: 'task' | 'reminder' | 'note';
  priority?: 'low' | 'medium' | 'high' | null;
  dueDate?: string | null;
  completed?: boolean;
};

export async function patchTask(
  userId: string,
  taskId: string,
  patch: TaskPatch
): Promise<{
  id: string;
  title: string;
  description: string | null;
  type: string;
  priority: string | null;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
}> {
  const res = await fetch(
    `${BASE_URL}/api/task/${encodeURIComponent(taskId)}`,
    {
      method: 'PATCH',
      headers: headers(userId, 'application/json'),
      body: JSON.stringify(patch),
    }
  );
  const json = (await res.json()) as {
    id?: string;
    title?: string;
    description?: string | null;
    type?: string;
    priority?: string | null;
    dueDate?: string | null;
    completed?: boolean;
    completedAt?: string | null;
    error?: string;
  };
  if (!res.ok) throw new Error(json.error || `Patch task failed: ${res.status}`);
  return {
    id: json.id!,
    title: json.title ?? '',
    description: json.description ?? null,
    type: json.type ?? 'task',
    priority: json.priority ?? null,
    dueDate: json.dueDate ?? null,
    completed: json.completed ?? false,
    completedAt: json.completedAt ?? null,
  };
}

export async function deleteTask(
  userId: string,
  taskId: string
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/task/${encodeURIComponent(taskId)}`,
    {
      method: 'DELETE',
      headers: headers(userId),
    }
  );
  if (!res.ok) {
    const json = (await res.json()) as { error?: string };
    throw new Error(json.error || `Delete task failed: ${res.status}`);
  }
}

export async function getLearningStickies(
  userId: string,
  params?: { domain?: string; limit?: number; offset?: number }
): Promise<{ learningStickies: LearningSticky[]; count: number }> {
  const search = new URLSearchParams();
  if (params?.domain) search.set('domain', params.domain);
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.offset) search.set('offset', String(params.offset));
  const qs = search.toString();
  const url = `${BASE_URL}/api/learning-stickies${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: headers(userId) });
  const json = (await res.json()) as {
    learningStickies?: LearningSticky[];
    count?: number;
    error?: string;
  };
  if (!res.ok) throw new Error(json.error || `Learning stickies failed: ${res.status}`);
  return {
    learningStickies: json.learningStickies ?? [],
    count: json.count ?? 0,
  };
}

export type { LearningSticky } from '../types';

export async function getLearningStickiesDomains(
  userId: string
): Promise<{ domains: Array<{ domain: string; count: number }> }> {
  const res = await fetch(`${BASE_URL}/api/learning-stickies/domains`, {
    headers: headers(userId),
  });
  const json = (await res.json()) as {
    domains?: Array<{ domain: string; count: number }>;
    error?: string;
  };
  if (!res.ok) throw new Error(json.error || `Domains failed: ${res.status}`);
  return { domains: json.domains ?? [] };
}

export async function deleteLearningSticky(
  userId: string,
  id: string
): Promise<void> {
  const res = await fetch(
    `${BASE_URL}/api/learning-stickies?id=${encodeURIComponent(id)}`,
    { method: 'DELETE', headers: headers(userId) }
  );
  if (!res.ok) {
    const json = (await res.json()) as { error?: string };
    throw new Error(json.error || `Delete failed: ${res.status}`);
  }
}

export async function deleteLearningStickiesByDomain(
  userId: string,
  domain: string
): Promise<{ count: number }> {
  const res = await fetch(
    `${BASE_URL}/api/learning-stickies?domain=${encodeURIComponent(domain)}`,
    { method: 'DELETE', headers: headers(userId) }
  );
  const json = (await res.json()) as { count?: number; error?: string };
  if (!res.ok) throw new Error(json.error || `Delete failed: ${res.status}`);
  return { count: json.count ?? 0 };
}

export async function generateLearningStickies(
  userId: string,
  domain: string,
  refine?: string
): Promise<{
  domain: string;
  learningStickiesCreated: number;
  learningStickies: LearningSticky[];
}> {
  const body: { domain: string; refine?: string } = { domain };
  if (refine?.trim()) body.refine = refine.trim();
  const res = await fetch(`${BASE_URL}/api/learning-stickies/generate`, {
    method: 'POST',
    headers: headers(userId, 'application/json'),
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    domain?: string;
    learningStickiesCreated?: number;
    learningStickies?: LearningSticky[];
    error?: string;
  };
  if (!res.ok) throw new Error(json.error || `Generate failed: ${res.status}`);
  return {
    domain: json.domain ?? domain,
    learningStickiesCreated: json.learningStickiesCreated ?? 0,
    learningStickies: json.learningStickies ?? [],
  };
}

export async function getLearningTaskSettings(
  userId: string
): Promise<{
  settings: Array<{ id: string; domain: string; frequencyDays: number; lastGeneratedAt: string | null; createdAt: string }>;
}> {
  const res = await fetch(`${BASE_URL}/api/learning-task-settings`, {
    headers: headers(userId),
  });
  const json = (await res.json()) as {
    settings?: Array<{ id: string; domain: string; frequencyDays: number; lastGeneratedAt: string | null; createdAt: string }>;
    error?: string;
  };
  if (!res.ok) throw new Error(json.error || `Get settings failed: ${res.status}`);
  return { settings: json.settings ?? [] };
}

export async function upsertLearningTaskSetting(
  userId: string,
  domain: string,
  frequencyDays: number
): Promise<{ id: string; domain: string; frequencyDays: number }> {
  const res = await fetch(`${BASE_URL}/api/learning-task-settings`, {
    method: 'POST',
    headers: headers(userId, 'application/json'),
    body: JSON.stringify({ domain, frequencyDays }),
  });
  const json = (await res.json()) as {
    setting?: { id: string; domain: string; frequencyDays: number };
    error?: string;
  };
  if (!res.ok) throw new Error(json.error || `Upsert setting failed: ${res.status}`);
  return json.setting!;
}

export async function generateLearningTasks(
  userId: string
): Promise<{
  generatedTasks: Array<{ id: string; title: string; type: string; priority: string | null; dueDate: string | null; createdAt: string }>;
  count: number;
}> {
  const res = await fetch(`${BASE_URL}/api/learning-tasks/generate`, {
    method: 'POST',
    headers: headers(userId, 'application/json'),
  });
  const json = (await res.json()) as {
    generatedTasks?: Array<{ id: string; title: string; type: string; priority: string | null; dueDate: string | null; createdAt: string }>;
    count?: number;
    error?: string;
  };
  if (!res.ok) throw new Error(json.error || `Generate tasks failed: ${res.status}`);
  return { generatedTasks: json.generatedTasks ?? [], count: json.count ?? 0 };
}

/**
 * Immediately creates a "Review [domain]" task at 9 AM today.
 * No LLM — direct DB insert, completes in ~100 ms.
 * Call this on chip-tap so the task appears in the Tasks tab right away.
 */
export async function createImmediateLearningTask(
  userId: string,
  domain: string
): Promise<{ id: string; title: string; dueDate: string | null }> {
  const res = await fetch(`${BASE_URL}/api/learning-tasks/now`, {
    method: 'POST',
    headers: headers(userId, 'application/json'),
    body: JSON.stringify({ domain }),
  });
  const json = (await res.json()) as {
    task?: { id: string; title: string; dueDate: string | null };
    error?: string;
  };
  if (!res.ok) throw new Error(json.error || `Create immediate task failed: ${res.status}`);
  return { id: json.task!.id, title: json.task!.title, dueDate: json.task?.dueDate ?? null };
}

export async function login(
  baseUrl: string,
  userId: string
): Promise<{ success: boolean; user?: { id: string; username: string; displayName: string } }> {
  const res = await fetch(`${baseUrl}/api/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const json = (await res.json()) as {
    success?: boolean;
    user?: { id: string; username: string; displayName: string };
    error?: string;
  };
  if (!res.ok) return { success: false };
  return { success: !!json.success, user: json.user };
}
