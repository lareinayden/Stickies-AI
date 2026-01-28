/**
 * Record → upload → poll status → summarize.
 * Uses expo-av for recording and our API client.
 */

import { useCallback, useState } from 'react';
import { Audio } from 'expo-av';
import {
  uploadVoice,
  getStatus,
  getTranscript,
  summarizeTranscript,
} from '../api/client';
import type { Task } from '../types';

type Phase =
  | 'idle'
  | 'recording'
  | 'uploading'
  | 'transcribing'
  | 'summarizing'
  | 'done'
  | 'error';

export function useVoiceUpload(userId: string | null) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ingestionId, setIngestionId] = useState<string | null>(null);

  const reset = useCallback(() => {
    setPhase('idle');
    setError(null);
    setTranscript(null);
    setTasks([]);
    setIngestionId(null);
  }, []);

  const updateTaskInList = useCallback((taskId: string, completed: boolean) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, completed, completedAt: completed ? new Date().toISOString() : null }
          : t
      )
    );
  }, []);

  const recordAndUpload = useCallback(async () => {
    if (!userId) {
      setError('Not logged in');
      setPhase('error');
      return;
    }

    setError(null);
    setPhase('recording');

    let recording: Audio.Recording | null = null;

    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Microphone permission denied');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recording = rec;

      // Record for 10 seconds (draft). Increase or add stop button for production.
      await new Promise<void>((resolve) => setTimeout(resolve, 10_000));
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (!uri) throw new Error('No recording URI');

      setPhase('uploading');
      const { ingestionId: id, status } = await uploadVoice(userId, uri, 'en');
      setIngestionId(id);

      if (status === 'failed') {
        throw new Error('Transcription failed');
      }

      setPhase('transcribing');
      // Poll until completed
      for (let i = 0; i < 60; i++) {
        const { status: st } = await getStatus(userId, id);
        if (st === 'completed') break;
        if (st === 'failed') throw new Error('Transcription failed');
        await new Promise((r) => setTimeout(r, 1000));
      }

      const tr = await getTranscript(userId, id);
      setTranscript(tr.transcript ?? '');

      setPhase('summarizing');
      const sum = await summarizeTranscript(userId, id);
      setTasks(
        sum.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          type: t.type as 'task' | 'reminder' | 'note',
          priority: t.priority as 'low' | 'medium' | 'high' | null,
          dueDate: t.dueDate,
          completed: t.completed,
          completedAt: null,
          createdAt: t.createdAt,
        }))
      );
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setPhase('error');
    } finally {
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (_) {}
      }
    }
  }, [userId]);

  return {
    phase,
    error,
    transcript,
    tasks,
    ingestionId,
    recordAndUpload,
    reset,
    updateTaskInList,
  };
}
