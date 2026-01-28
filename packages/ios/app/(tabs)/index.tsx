import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VoiceRecorder } from '../../src/components/VoiceRecorder';
import { TaskCard } from '../../src/components/TaskCard';
import { useVoiceUpload } from '../../src/hooks/useVoiceUpload';
import { updateTask } from '../../src/api/client';
import type { Task } from '../../src/types';

const USER_KEY = 'stickies_user_id';

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const {
    phase,
    error,
    transcript,
    tasks,
    recordAndUpload,
    reset,
    updateTaskInList,
  } = useVoiceUpload(userId);

  useEffect(() => {
    AsyncStorage.getItem(USER_KEY).then(setUserId);
  }, []);

  const handleToggle = async (taskId: string, completed: boolean) => {
    if (!userId) return;
    try {
      await updateTask(userId, taskId, { completed });
      updateTaskInList(taskId, completed);
    } catch (_) {}
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => {
            AsyncStorage.getItem(USER_KEY).then(setUserId);
          }}
        />
      }
    >
      <VoiceRecorder
        phase={phase}
        error={error}
        onRecord={recordAndUpload}
        onReset={reset}
        disabled={!userId}
      />
      {transcript ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transcript</Text>
          <Text style={styles.transcript}>{transcript}</Text>
        </View>
      ) : null}
      {tasks.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tasks from this recording</Text>
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} onToggleComplete={handleToggle} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  section: { marginTop: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  transcript: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
});
