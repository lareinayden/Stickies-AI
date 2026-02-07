'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { getCurrentUserId, clearSession } from '@/lib/auth/session';
import { getUserById, type TestUser } from '@/lib/auth/users';

interface UploadResponse {
  ingestionId: string;
  status: string;
  message?: string;
  error?: string;
}

interface StatusResponse {
  ingestionId: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  metadata: {
    originalFilename: string | null;
    fileSize: number | null;
    durationSeconds: number | null;
    audioFormat: string | null;
    language: string | null;
  };
}

interface TranscriptResponse {
  ingestionId: string;
  status: string;
  transcript?: string;
  language?: string;
  segments?: Array<{ start: number; end: number; text: string }>;
  confidenceScores?: Record<string, number>;
  metadata?: {
    originalFilename: string;
    durationSeconds: number;
    createdAt: string;
    completedAt: string;
  };
  error?: string;
  message?: string;
}

interface LearningSticky {
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

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  priority: string | null;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

const AREA_COLORS = ['#fef9c3', '#fce7f3', '#dbeafe', '#dcfce7', '#ffedd5', '#ede9fe'] as const;
function colorForArea(domain: string): string {
  let n = 0;
  for (let i = 0; i < domain.length; i++) {
    n = (n * 31 + domain.charCodeAt(i)) >>> 0;
  }
  return AREA_COLORS[n % AREA_COLORS.length];
}

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<TestUser | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'stickies'>('home');
  const [inputMode, setInputMode] = useState<'voice' | 'type'>('voice');
  const [textInput, setTextInput] = useState('');
  const [processingTasks, setProcessingTasks] = useState(false);
  const [processingLearn, setProcessingLearn] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState('');
  const [translate, setTranslate] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [ingestionId, setIngestionId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [transcript, setTranscript] = useState<TranscriptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  // Learning stickies: areas of interest + detail view
  const [areas, setAreas] = useState<Array<{ domain: string; count: number }>>([]);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [areaStickies, setAreaStickies] = useState<LearningSticky[]>([]);
  const [stickiesLoading, setStickiesLoading] = useState(false);
  const [stickiesError, setStickiesError] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [refineInput, setRefineInput] = useState('');
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [areasEditMode, setAreasEditMode] = useState(false);
  const [stickiesEditMode, setStickiesEditMode] = useState(false);

  // Tasks tab: inline list with Edit/Delete
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [taskEditingId, setTaskEditingId] = useState<string | null>(null);
  const [taskEditForm, setTaskEditForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    type: 'task',
    priority: '',
  });

  // Check authentication on mount
  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      router.push('/login');
      return;
    }
    
    const user = getUserById(userId);
    if (!user) {
      clearSession();
      router.push('/login');
      return;
    }
    
    setCurrentUser(user);
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setIngestionId(null);
      setStatus(null);
      setTranscript(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);
    setStatus(null);
    setTranscript(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (language) formData.append('language', language);
      if (translate) formData.append('translate', 'true');
      if (prompt) formData.append('prompt', prompt);

      const response = await fetch('/api/voice/upload', {
        method: 'POST',
        body: formData,
      });

      const data: UploadResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setIngestionId(data.ingestionId);

      // If status is processing or pending, start polling
      if (data.status === 'processing' || data.status === 'pending') {
        setPolling(true);
        pollStatus(data.ingestionId);
      } else {
        // If completed, fetch transcript immediately
        fetchTranscript(data.ingestionId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const pollStatus = async (id: string) => {
    const maxAttempts = 60; // 5 minutes max (5s intervals)
    let attempts = 0;

    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        setPolling(false);
        setError('Status check timeout');
        return;
      }

      try {
        const response = await fetch(`/api/voice/status/${id}`);
        const data: StatusResponse = await response.json();

        if (response.ok) {
          setStatus(data);

          if (data.status === 'completed') {
            setPolling(false);
            fetchTranscript(id);
          } else if (data.status === 'failed') {
            setPolling(false);
            setError(data.errorMessage || 'Transcription failed');
          } else {
            // Still processing, check again in 5 seconds
            attempts++;
            setTimeout(checkStatus, 5000);
          }
        }
      } catch (err) {
        setPolling(false);
        setError('Failed to check status');
      }
    };

    checkStatus();
  };

  const fetchStatus = async () => {
    if (!ingestionId) return;

    try {
      const response = await fetch(`/api/voice/status/${ingestionId}`);
      const data: StatusResponse = await response.json();

      if (response.ok) {
        setStatus(data);
      } else {
        setError('Failed to fetch status');
      }
    } catch (err) {
      setError('Failed to fetch status');
    }
  };

  const fetchTranscript = async (id?: string) => {
    const targetId = id ?? ingestionId;
    if (!targetId) return;

    try {
      const response = await fetch(`/api/voice/transcript/${targetId}`);
      const data: TranscriptResponse = await response.json();

      if (response.status === 202) {
        // Still processing
        setError(data.message || 'Still processing...');
      } else if (response.ok) {
        setTranscript(data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch transcript');
      }
    } catch (err) {
      setError('Failed to fetch transcript');
    }
  };

  const fetchDomains = useCallback(async () => {
    setStickiesLoading(true);
    setStickiesError(null);
    try {
      const response = await fetch('/api/learning-stickies/domains');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load areas');
      }
      setAreas(data.domains ?? []);
    } catch (err) {
      setStickiesError(err instanceof Error ? err.message : 'Failed to load areas');
    } finally {
      setStickiesLoading(false);
    }
  }, []);

  const fetchAreaStickies = useCallback(async (domain: string) => {
    setStickiesLoading(true);
    setStickiesError(null);
    try {
      const response = await fetch(`/api/learning-stickies?domain=${encodeURIComponent(domain)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load stickies');
      }
      setAreaStickies(data.learningStickies ?? []);
    } catch (err) {
      setStickiesError(err instanceof Error ? err.message : 'Failed to load stickies');
    } finally {
      setStickiesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'stickies' && currentUser) {
      fetchDomains();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (activeTab === 'stickies' && selectedArea) {
      fetchAreaStickies(selectedArea);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedArea]);

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    setTasksError(null);
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tasks');
      setTasks(data.tasks ?? []);
    } catch (e) {
      setTasksError(e instanceof Error ? e.message : 'Failed to load tasks');
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchTasks();
    }
  }, [activeTab, fetchTasks]);

  const handleTaskToggleComplete = async (taskId: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/task/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) return;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, completed, completedAt: completed ? new Date().toISOString() : null }
            : t
        )
      );
    } catch (_) {}
  };

  const handleTaskDelete = async (taskId: string) => {
    try {
      const res = await fetch(`/api/task/${taskId}`, { method: 'DELETE' });
      if (!res.ok) return;
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (_) {}
  };

  const startTaskEdit = (task: TaskItem) => {
    setTaskEditingId(task.id);
    setTaskEditForm({
      title: task.title,
      description: task.description ?? '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
      type: task.type ?? 'task',
      priority: task.priority ?? '',
    });
  };

  const cancelTaskEdit = () => {
    setTaskEditingId(null);
  };

  const handleTaskSaveEdit = async () => {
    if (!taskEditingId) return;
    const title = taskEditForm.title.trim();
    if (!title) return;
    try {
      const body: Record<string, unknown> = {
        title,
        description: taskEditForm.description.trim() || null,
        dueDate: taskEditForm.dueDate || null,
      };
      if (['task', 'reminder', 'note'].includes(taskEditForm.type)) {
        body.type = taskEditForm.type;
      }
      if (['low', 'medium', 'high'].includes(taskEditForm.priority)) {
        body.priority = taskEditForm.priority;
      }
      const res = await fetch(`/api/task/${taskEditingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskEditingId
            ? {
                ...t,
                title: updated.title ?? t.title,
                description: updated.description ?? t.description,
                type: updated.type ?? t.type,
                priority: updated.priority ?? t.priority,
                dueDate: updated.dueDate ?? t.dueDate,
              }
            : t
        )
      );
      setTaskEditingId(null);
    } catch (_) {}
  };

  const handleGenerateStickies = async () => {
    const domain = domainInput.trim();
    if (!domain) {
      setGenerateError('Describe what you want to learn (e.g. help me prepare for driver\'s license test)');
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    try {
      const response = await fetch('/api/learning-stickies/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate learning stickies');
      }
      setDomainInput('');
      await fetchDomains();
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  const handleRefineStickies = async () => {
    if (!selectedArea) return;
    const prompt = refineInput.trim();
    setRefining(true);
    setRefineError(null);
    try {
      const response = await fetch('/api/learning-stickies/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: selectedArea, refine: prompt || undefined }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add more stickies');
      }
      setRefineInput('');
      await fetchAreaStickies(selectedArea);
      await fetchDomains();
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : 'Failed to add more');
    } finally {
      setRefining(false);
    }
  };

  const handleRemoveSticky = async (id: string) => {
    try {
      const response = await fetch(`/api/learning-stickies?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!response.ok) return;
      if (selectedArea) {
        await fetchAreaStickies(selectedArea);
        await fetchDomains();
      }
    } catch (_) {}
  };

  const handleRemoveAreaFromList = async (domain: string) => {
    if (!confirm(`Remove area "${domain}" and all its stickies?`)) return;
    try {
      const response = await fetch(`/api/learning-stickies?domain=${encodeURIComponent(domain)}`, {
        method: 'DELETE',
      });
      if (!response.ok) return;
      if (selectedArea === domain) {
        setSelectedArea(null);
        setAreaStickies([]);
      }
      await fetchDomains();
    } catch (_) {}
  };

  const homeContent = inputMode === 'voice' ? (transcript?.transcript ?? '') : textInput.trim();
  const hasHomeContent = homeContent.length > 0;

  const handleExtractTasks = async () => {
    if (!hasHomeContent) return;
    setProcessingTasks(true);
    setHomeError(null);
    try {
      if (inputMode === 'voice' && ingestionId) {
        const response = await fetch(`/api/voice/summarize/${ingestionId}`, { method: 'POST' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to extract tasks');
      } else {
        const response = await fetch('/api/tasks/from-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: homeContent }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to extract tasks');
      }
      if (inputMode === 'type') setTextInput('');
      setActiveTab('tasks');
    } catch (err) {
      setHomeError(err instanceof Error ? err.message : 'Failed to extract tasks');
    } finally {
      setProcessingTasks(false);
    }
  };

  const handleCreateLearningArea = async () => {
    if (!hasHomeContent) return;
    setProcessingLearn(true);
    setHomeError(null);
    try {
      const response = await fetch('/api/learning-stickies/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: homeContent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create learning area');
      if (inputMode === 'type') setTextInput('');
      await fetchDomains();
      setActiveTab('stickies');
    } catch (err) {
      setHomeError(err instanceof Error ? err.message : 'Failed to create learning area');
    } finally {
      setProcessingLearn(false);
    }
  };

  // Show loading state while checking auth
  if (!currentUser) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                Stickies AI
              </h1>
              <p className="text-gray-600 mb-8">
                Add tasks or learning areas by voice or by typing
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Logged in as</p>
                <p className="font-semibold text-gray-800">{currentUser.displayName}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                Switch Account
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 border-b border-gray-200 overflow-visible">
            <nav className="flex flex-wrap gap-2 sm:gap-4" role="tablist" aria-label="Main sections">
              <button
                role="tab"
                aria-selected={activeTab === 'home'}
                onClick={() => { setActiveTab('home'); setError(null); setHomeError(null); }}
                className={`px-4 py-2.5 font-semibold border-b-2 -mb-px transition-colors rounded-t ${
                  activeTab === 'home'
                    ? 'border-blue-600 text-blue-600 bg-white border-t border-x border-gray-200'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Home
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'tasks'}
                onClick={() => setActiveTab('tasks')}
                className={`px-4 py-2.5 font-semibold border-b-2 -mb-px transition-colors rounded-t ${
                  activeTab === 'tasks'
                    ? 'border-blue-600 text-blue-600 bg-white border-t border-x border-gray-200'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Tasks
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'stickies'}
                onClick={() => {
                  setActiveTab('stickies');
                  setStickiesError(null);
                  setGenerateError(null);
                }}
                className={`px-4 py-2.5 font-semibold border-b-2 -mb-px transition-colors rounded-t ${
                  activeTab === 'stickies'
                    ? 'border-blue-600 text-blue-600 bg-white border-t border-x border-gray-200'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Learning Stickies
              </button>
            </nav>
          </div>

          {/* Home: unified input (Voice or Type) → Tasks or Learn */}
          {activeTab === 'home' && (
            <div className="mb-8 space-y-6">
              <div className="flex gap-4 flex-wrap">
                <span className="text-sm font-medium text-gray-700">Input:</span>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="inputMode"
                    checked={inputMode === 'voice'}
                    onChange={() => setInputMode('voice')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  Voice (record or upload)
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="inputMode"
                    checked={inputMode === 'type'}
                    onChange={() => setInputMode('type')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  Type
                </label>
              </div>

              {inputMode === 'voice' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Upload or record</h3>
                <p className="text-sm text-gray-600 mb-4">Upload an audio file or use the recorder below. After transcription, choose to extract tasks or create a learning area.</p>
              </div>
              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
                {/* Upload */}
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                  <h4 className="font-medium text-gray-800 mb-2">Upload file</h4>
                  <input
                    type="file"
                    accept="audio/*,.wav,.webm,.m4a,.mp3,.mp4,.mpeg,.mpga"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700"
                    disabled={uploading || polling}
                  />
                  {file && <p className="mt-2 text-sm text-gray-600">Selected: {file.name}</p>}
                  <button
                    onClick={handleUpload}
                    disabled={!file || uploading || polling}
                    className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {uploading ? 'Uploading…' : polling ? 'Processing…' : 'Upload & transcribe'}
                  </button>
                </div>
                {/* Microphone */}
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                  <h4 className="font-medium text-gray-800 mb-2">Record</h4>
                  <VoiceRecorder
                    language={language || undefined}
                    translate={translate}
                    prompt={prompt || undefined}
                    onUploadStart={() => { setUploading(true); setError(null); setStatus(null); setTranscript(null); }}
                    onUploadComplete={(id) => { setIngestionId(id); setUploading(false); setPolling(true); pollStatus(id); }}
                    onError={(e) => { setError(e); setUploading(false); }}
                  />
                </div>
              </div>
              {transcript?.transcript && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="text-sm font-medium text-gray-600 mb-2">Transcript</p>
                  <p className="text-gray-800 text-sm whitespace-pre-wrap">{transcript.transcript}</p>
                </div>
              )}
            </div>
              )}

              {inputMode === 'type' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Describe tasks or what you want to learn</label>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="e.g. Buy groceries tomorrow at 10am. Call dentist. I want to learn React hooks and driver's license rules."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {hasHomeContent && (
                <div className="flex gap-3 flex-wrap items-center pt-2">
                  <span className="text-sm font-medium text-gray-700">Then:</span>
                  <button
                    onClick={handleExtractTasks}
                    disabled={processingTasks}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {processingTasks ? 'Extracting…' : 'Extract tasks'}
                  </button>
                  <button
                    onClick={handleCreateLearningArea}
                    disabled={processingLearn}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
                  >
                    {processingLearn ? 'Creating…' : 'Create learning area'}
                  </button>
                </div>
              )}

              {(homeError || (activeTab === 'home' && error)) && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-semibold">Error</p>
                  <p className="text-red-600">{homeError || error}</p>
                </div>
              )}
            </div>
          )}

          {/* Tasks tab: inline list with Edit/Delete */}
          {activeTab === 'tasks' && (
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">Tasks</h2>
              <p className="text-gray-600 mb-4">
                Your tasks and reminders. Add more from Home (voice or type). Use Edit or Delete on each row to change or remove a task.
              </p>
              {tasksLoading && <p className="text-gray-500">Loading tasks…</p>}
              {tasksError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600">{tasksError}</p>
                </div>
              )}
              {!tasksLoading && !tasksError && tasks.length === 0 && (
                <p className="text-gray-500">No tasks yet. Add some from the Home tab (voice or type).</p>
              )}
              {!tasksLoading && !tasksError && tasks.length > 0 && (
                <ul className="space-y-3 list-none p-0 m-0">
                  {tasks.map((task) =>
                    taskEditingId === task.id ? (
                      <li key={task.id} className="flex flex-col gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50/30">
                        <input
                          type="text"
                          value={taskEditForm.title}
                          onChange={(e) => setTaskEditForm((f) => ({ ...f, title: e.target.value }))}
                          placeholder="Title"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <textarea
                          value={taskEditForm.description}
                          onChange={(e) => setTaskEditForm((f) => ({ ...f, description: e.target.value }))}
                          placeholder="Description (optional)"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <div className="flex flex-wrap gap-3 items-center">
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            Due:
                            <input
                              type="date"
                              value={taskEditForm.dueDate}
                              onChange={(e) => setTaskEditForm((f) => ({ ...f, dueDate: e.target.value }))}
                              className="px-3 py-1.5 border border-gray-300 rounded-lg"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            Type:
                            <select
                              value={taskEditForm.type}
                              onChange={(e) => setTaskEditForm((f) => ({ ...f, type: e.target.value }))}
                              className="px-3 py-1.5 border border-gray-300 rounded-lg"
                            >
                              <option value="task">Task</option>
                              <option value="reminder">Reminder</option>
                              <option value="note">Note</option>
                            </select>
                          </label>
                          <label className="flex items-center gap-2 text-sm text-gray-700">
                            Priority:
                            <select
                              value={taskEditForm.priority}
                              onChange={(e) => setTaskEditForm((f) => ({ ...f, priority: e.target.value }))}
                              className="px-3 py-1.5 border border-gray-300 rounded-lg"
                            >
                              <option value="">None</option>
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </label>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button type="button" onClick={cancelTaskEdit} className="px-3 py-1.5 text-sm font-medium text-gray-700">
                            Cancel
                          </button>
                          <button type="button" onClick={handleTaskSaveEdit} className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg">
                            Save
                          </button>
                        </div>
                      </li>
                    ) : (
                      <li
                        key={task.id}
                        className={`p-4 rounded-lg border bg-white flex flex-wrap items-center gap-2 ${
                          task.completed ? 'border-gray-200 bg-gray-50/50' : 'border-gray-200'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => startTaskEdit(task)}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded border border-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTaskDelete(task.id)}
                          className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-200 hover:bg-red-100 hover:text-red-700 rounded border border-gray-300"
                        >
                          Delete
                        </button>
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={(e) => handleTaskToggleComplete(task.id, e.target.checked)}
                          className="h-4 w-4 shrink-0 text-blue-600 rounded focus:ring-blue-500"
                          aria-label={`Mark ${task.title} complete`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`font-medium text-gray-900 ${task.completed ? 'line-through text-gray-500' : ''}`}>
                            {task.title}
                          </p>
                          {task.description && <p className="mt-1 text-sm text-gray-600">{task.description}</p>}
                          {task.dueDate && (
                            <p className="mt-1 text-xs text-gray-500">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                          )}
                          {(task.type || task.priority) && (
                            <p className="mt-1 text-xs text-gray-400">
                              {[task.type, task.priority].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                      </li>
                    )
                  )}
                </ul>
              )}
            </div>
          )}

          {/* Learning Stickies Tab */}
          {activeTab === 'stickies' && (
            <div className="mb-8 space-y-8">
              <h2 className="text-2xl font-semibold text-gray-700">
                Learning Stickies
              </h2>
              <p className="text-gray-600">
                Tap an area to view and edit its stickies; add new learning areas from the Home tab (voice or type). You can refine stickies by prompting the LLM or remove stickies/areas.
              </p>

              {stickiesError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-semibold">Error</p>
                  <p className="text-red-600">{stickiesError}</p>
                </div>
              )}

              {selectedArea ? (
                /* Detail: stickies for one area */
                <>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => { setSelectedArea(null); setStickiesError(null); setStickiesEditMode(false); }}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                      ← Back to areas
                    </button>
                    <h3 className="text-lg font-semibold text-gray-800 truncate flex-1 min-w-0">{selectedArea}</h3>
                    {areaStickies.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setStickiesEditMode((v) => !v)}
                        className="text-sm font-medium text-gray-600 hover:text-gray-900 shrink-0"
                      >
                        {stickiesEditMode ? 'Done' : 'Edit'}
                      </button>
                    )}
                  </div>
                  <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Refine or add more (prompt the LLM)</label>
                    <div className="flex gap-2 flex-wrap">
                      <input
                        type="text"
                        value={refineInput}
                        onChange={(e) => setRefineInput(e.target.value)}
                        placeholder="e.g. add speed limits for school zones"
                        className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyDown={(e) => e.key === 'Enter' && handleRefineStickies()}
                      />
                      <button
                        onClick={handleRefineStickies}
                        disabled={refining}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
                      >
                        {refining ? 'Adding…' : 'Add more'}
                      </button>
                    </div>
                    {refineError && <p className="mt-2 text-sm text-red-600">{refineError}</p>}
                  </div>
                  {stickiesLoading && areaStickies.length === 0 && <p className="text-gray-500">Loading stickies…</p>}
                  {!stickiesLoading && areaStickies.length === 0 && !stickiesError && (
                    <p className="text-gray-500">No stickies in this area. Use “Add more” above to prompt the LLM.</p>
                  )}
                  {areaStickies.length > 0 && selectedArea && (
                    <ul className="space-y-4">
                      {areaStickies.map((s) => (
                        <li
                          key={s.id}
                          className="rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow flex justify-between gap-4 border border-gray-200/80"
                          style={{ backgroundColor: colorForArea(selectedArea) }}
                        >
                          <div className="min-w-0 flex-1">
                            <h4 className="text-lg font-semibold text-gray-900">{s.concept}</h4>
                            <p className="mt-2 text-gray-700 text-sm leading-relaxed">{s.definition}</p>
                          </div>
                          {stickiesEditMode && (
                            <button type="button" onClick={() => handleRemoveSticky(s.id)} className="shrink-0 text-sm text-gray-500 hover:text-red-600" title="Remove sticky">Remove</button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                /* Areas list */
                <>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {areas.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setAreasEditMode((v) => !v)}
                          className="text-sm font-medium text-gray-600 hover:text-gray-900"
                        >
                          {areasEditMode ? 'Done' : 'Edit'}
                        </button>
                      </>
                    )}
                  </div>
                  {stickiesLoading && areas.length === 0 && <p className="text-gray-500">Loading areas…</p>}
                  {!stickiesLoading && areas.length === 0 && !stickiesError && <p className="text-gray-500">No areas yet. Add one from the Home tab (voice or type), then choose “Create learning area”.</p>}
                  {areas.length > 0 && (
                    <ul className="space-y-3">
                      {areas.map((a) => (
                        <li key={a.domain} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => !areasEditMode && setSelectedArea(a.domain)}
                            className="flex-1 min-w-0 text-left rounded-lg p-4 shadow-sm hover:shadow-md transition-all border border-gray-200/80"
                            style={{ backgroundColor: colorForArea(a.domain) }}
                          >
                            <span className="font-medium text-gray-900">{a.domain}</span>
                            <span className="ml-2 text-sm text-gray-500">({a.count} stickies)</span>
                          </button>
                          {areasEditMode && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAreaFromList(a.domain)}
                              className="shrink-0 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg"
                            >
                              Remove
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-semibold">Error</p>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Status Display */}
          {ingestionId && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-gray-700">
                  Status
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={fetchStatus}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    Refresh Status
                  </button>
                  <button
                    onClick={() => fetchTranscript()}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                  >
                    Get Transcript
                  </button>
                </div>
              </div>

              {status && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="font-semibold">
                        <span
                          className={`inline-block px-2 py-1 rounded text-sm ${
                            status.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : status.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : status.status === 'processing'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {status.status}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Ingestion ID</p>
                      <p className="font-mono text-xs text-gray-800 break-all">
                        {status.ingestionId}
                      </p>
                    </div>
                    {status.metadata.originalFilename && (
                      <div>
                        <p className="text-sm text-gray-600">Filename</p>
                        <p className="font-semibold">
                          {status.metadata.originalFilename}
                        </p>
                      </div>
                    )}
                    {status.metadata.durationSeconds && (
                      <div>
                        <p className="text-sm text-gray-600">Duration</p>
                        <p className="font-semibold">
                          {status.metadata.durationSeconds.toFixed(2)}s
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transcript Display */}
          {transcript && (
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                Transcription Result
              </h2>

              <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                {/* Full Transcript */}
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    Full Transcript
                  </p>
                  <p className="text-gray-800 bg-white p-4 rounded border border-gray-200">
                    {transcript.transcript || 'No transcript available'}
                  </p>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  {transcript.language && (
                    <div>
                      <p className="text-sm text-gray-600">Language</p>
                      <p className="font-semibold">{transcript.language}</p>
                    </div>
                  )}
                  {transcript.confidenceScores?.overall && (
                    <div>
                      <p className="text-sm text-gray-600">Confidence</p>
                      <p className="font-semibold">
                        {(transcript.confidenceScores.overall * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>

                {/* Segments */}
                {transcript.segments && transcript.segments.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">
                      Segments ({transcript.segments.length})
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {transcript.segments.map((segment, index) => (
                        <div
                          key={index}
                          className="bg-white p-3 rounded border border-gray-200"
                        >
                          <p className="text-xs text-gray-500 mb-1">
                            {segment.start.toFixed(2)}s - {segment.end.toFixed(2)}s
                          </p>
                          <p className="text-sm text-gray-800">{segment.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* API Documentation Link */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              For API documentation, see{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">API_DOCUMENTATION.md</code>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
