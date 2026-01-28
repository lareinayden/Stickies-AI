import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TaskCard } from '../../src/components/TaskCard';
import { getTasks, updateTask } from '../../src/api/client';
import type { Task } from '../../src/types';

const USER_KEY = 'stickies_user_id';

export default function Tasks() {
  const [userId, setUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const uid = await AsyncStorage.getItem(USER_KEY);
    setUserId(uid);
    if (!uid) return;
    setFetchError(null);
    setLoading(true);
    try {
      const { tasks: list } = await getTasks(uid);
      setTasks(list ?? []);
    } catch (e) {
      setTasks([]);
      setFetchError(e instanceof Error ? e.message : 'Could not load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (userId) load();
    }, [userId, load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleToggle = useCallback(
    async (taskId: string, completed: boolean) => {
      if (!userId) return;
      try {
        await updateTask(userId, taskId, { completed });
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, completed, completedAt: completed ? new Date().toISOString() : null } : t
          )
        );
      } catch (_) {}
    },
    [userId]
  );

  if (!userId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>Log in to see tasks.</Text>
      </View>
    );
  }

  if (fetchError && tasks.length === 0) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: '#f8fafc' }}
        contentContainerStyle={[styles.centered, { flexGrow: 1 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.errorTitle}>Could not load tasks</Text>
        <Text style={styles.empty}>{fetchError}</Text>
        <Text style={styles.hint}>Pull down to retry.</Text>
      </ScrollView>
    );
  }

  if (loading && tasks.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>Loading…</Text>
      </View>
    );
  }

  if (tasks.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>No tasks yet. Record voice on Home to create some.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(t) => t.id}
      renderItem={({ item }) => (
        <TaskCard task={item} onToggleComplete={handleToggle} />
      )}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  empty: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  hint: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 12,
  },
});
