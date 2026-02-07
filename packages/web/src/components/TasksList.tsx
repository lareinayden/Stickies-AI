'use client';

import { useState, useEffect, useCallback } from 'react';

export interface TaskItem {
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

export function TasksList() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    dueDate: string;
    type: string;
    priority: string;
  }>({ title: '', description: '', dueDate: '', type: 'task', priority: '' });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tasks');
      setTasks(data.tasks ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
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
            ? {
                ...t,
                completed,
                completedAt: completed ? new Date().toISOString() : null,
              }
            : t
        )
      );
    } catch (_) {}
  };

  const handleDelete = async (taskId: string) => {
    try {
      const res = await fetch(`/api/task/${taskId}`, { method: 'DELETE' });
      if (!res.ok) return;
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (_) {}
  };

  const startEdit = (task: TaskItem) => {
    setEditingId(task.id);
    setEditForm({
      title: task.title,
      description: task.description ?? '',
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().slice(0, 10)
        : '',
      type: task.type ?? 'task',
      priority: task.priority ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const title = editForm.title.trim();
    if (!title) return;
    try {
      const body: {
        title: string;
        description?: string | null;
        type?: 'task' | 'reminder' | 'note';
        priority?: 'low' | 'medium' | 'high' | null;
        dueDate?: string | null;
      } = {
        title,
        description: editForm.description.trim() || null,
        type: ['task', 'reminder', 'note'].includes(editForm.type)
          ? (editForm.type as 'task' | 'reminder' | 'note')
          : undefined,
        priority: ['low', 'medium', 'high'].includes(editForm.priority)
          ? (editForm.priority as 'low' | 'medium' | 'high')
          : null,
        dueDate: editForm.dueDate ? editForm.dueDate : null,
      };
      const res = await fetch(`/api/task/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingId
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
      setEditingId(null);
    } catch (_) {}
  };

  if (loading) return <p className="text-gray-500">Loading tasks…</p>;
  if (error)
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
      </div>
    );
  if (tasks.length === 0)
    return (
      <p className="text-gray-500">
        No tasks yet. Add some from the <strong>Home</strong> tab (voice or type). You can then edit or delete them here.
      </p>
    );

  return (
    <ul className="space-y-3 list-none p-0 m-0">
      {tasks.map((task) =>
        editingId === task.id ? (
          <li
            key={task.id}
            className="flex flex-col gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50/30"
          >
            <input
              type="text"
              value={editForm.title}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <textarea
              value={editForm.description}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Description (optional)"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <div className="flex flex-wrap gap-3 items-center">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                Due:
                <input
                  type="date"
                  value={editForm.dueDate}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, dueDate: e.target.value }))
                  }
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                Type:
                <select
                  value={editForm.type}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, type: e.target.value }))
                  }
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="task">Task</option>
                  <option value="reminder">Reminder</option>
                  <option value="note">Note</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                Priority:
                <select
                  value={editForm.priority}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, priority: e.target.value }))
                  }
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
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
              onClick={() => startEdit(task)}
              className="order-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded border border-blue-600"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelete(task.id)}
              className="order-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-200 hover:bg-red-100 hover:text-red-700 rounded border border-gray-300"
            >
              Delete
            </button>
            <input
              type="checkbox"
              checked={task.completed}
              onChange={(e) =>
                handleToggleComplete(task.id, e.target.checked)
              }
              className="order-3 mt-0.5 h-4 w-4 shrink-0 text-blue-600 rounded focus:ring-blue-500"
              aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
            />
            <div className="order-4 min-w-0 flex-1">
              <p
                className={`font-medium text-gray-900 ${task.completed ? 'line-through text-gray-500' : ''}`}
              >
                {task.title}
              </p>
              {task.description && (
                <p className="mt-1 text-sm text-gray-600">{task.description}</p>
              )}
              {task.dueDate && (
                <p className="mt-1 text-xs text-gray-500">
                  Due: {new Date(task.dueDate).toLocaleDateString()}
                </p>
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
  );
}
