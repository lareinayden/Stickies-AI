/**
 * API client for Stickies AI web backend
 * Uses X-User-Id for auth (mock users).
 */

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
