/**
 * Record → upload → poll status → summarize.
 * Uses expo-av for recording and our API client.
 * Manual start/stop and cancel; real-time duration.
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import {
  uploadVoice,
  getStatus,
  getTranscript,
  summarizeTranscript,
  type Auth,
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

export function useVoiceUpload(auth: Auth | null) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ingestionId, setIngestionId] = useState<string | null>(null);
  const [recordingDurationSeconds, setRecordingDurationSeconds] = useState(0);
  /** Current metering in dBFS (-160 to 0). Only set while recording; used for soundwave. */
  const [meteringDb, setMeteringDb] = useState<number | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      recordingRef.current = null;
    };
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    recordingRef.current = null;
    setPhase('idle');
    setError(null);
    setTranscript(null);
    setTasks([]);
    setIngestionId(null);
    setRecordingDurationSeconds(0);
    setMeteringDb(null);
  }, [clearTimer]);

  const updateTaskInList = useCallback((taskId: string, completed: boolean) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, completed, completedAt: completed ? new Date().toISOString() : null }
          : t
      )
    );
  }, []);

  const startRecording = useCallback(async () => {
    if (!auth) {
      setError('Not logged in');
      setPhase('error');
      return;
    }

    setError(null);
    setRecordingDurationSeconds(0);
    setPhase('recording');

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

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;

      recording.setProgressUpdateInterval(80);
      recording.setOnRecordingStatusUpdate((status) => {
        if (typeof status.metering === 'number') {
          setMeteringDb(status.metering);
        }
      });

      clearTimer();
      timerRef.current = setInterval(() => {
        setRecordingDurationSeconds((s) => s + 1);
      }, 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setPhase('error');
      recordingRef.current = null;
    }
  }, [auth, clearTimer]);

  const uploadAndSummarize = useCallback(
    async (uri: string) => {
      if (!auth) return;

      setPhase('uploading');
      const { ingestionId: id, status } = await uploadVoice(auth, uri, 'en');
      setIngestionId(id);

      if (status === 'failed') {
        throw new Error('Transcription failed');
      }

      setPhase('transcribing');
      for (let i = 0; i < 60; i++) {
        const { status: st } = await getStatus(auth, id);
        if (st === 'completed') break;
        if (st === 'failed') throw new Error('Transcription failed');
        await new Promise((r) => setTimeout(r, 1000));
      }

      const tr = await getTranscript(auth, id);
      setTranscript(tr.transcript ?? '');
      setPhase('done');
    },
    [auth]
  );

  const extractTasksFromVoice = useCallback(async () => {
    if (!auth || !ingestionId || !transcript) return;
    setPhase('summarizing');
    setError(null);
    try {
      const sum = await summarizeTranscript(auth, ingestionId);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to extract tasks');
    } finally {
      setPhase('done');
    }
  }, [auth, ingestionId, transcript]);

  const stopAndUpload = useCallback(async () => {
    const rec = recordingRef.current;
    if (!rec || phase !== 'recording') return;

    clearTimer();
    recordingRef.current = null;
    setMeteringDb(null);
    setPhase('uploading');

    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (!uri) {
        throw new Error('No recording URI');
      }
      await uploadAndSummarize(uri);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setPhase('error');
    }
  }, [phase, clearTimer, uploadAndSummarize]);

  const cancelRecording = useCallback(async () => {
    const rec = recordingRef.current;
    if (!rec || phase !== 'recording') return;

    clearTimer();
    recordingRef.current = null;
    setRecordingDurationSeconds(0);
    setMeteringDb(null);
    setPhase('idle');
    setError(null);

    try {
      await rec.stopAndUnloadAsync();
    } catch (_) {}
  }, [phase, clearTimer]);

  return {
    phase,
    error,
    transcript,
    tasks,
    ingestionId,
    recordingDurationSeconds,
    meteringDb,
    startRecording,
    stopAndUpload,
    cancelRecording,
    reset,
    updateTaskInList,
    extractTasksFromVoice,
  };
}
