import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TaskCard } from '../../src/components/TaskCard';
import { StickyCard } from '../../src/components/StickyCard';
import { Swipeable } from '../../src/components/Swipeable';
import { getTasks, updateTask, patchTask, deleteTask } from '../../src/api/client';
import { StickiesColors } from '../../src/theme/stickies';
import { hapticFeedback } from '../../src/utils/haptics';
import type { Task } from '../../src/types';

const USER_KEY = 'stickies_user_id';

export default function Tasks() {
  const [userId, setUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    type: 'task' as 'task' | 'reminder' | 'note',
    priority: '' as '' | 'low' | 'medium' | 'high',
  });
  const [saving, setSaving] = useState(false);

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

  const openEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      description: task.description ?? '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
      type: task.type,
      priority: task.priority ?? '',
    });
  }, []);

  const closeEdit = useCallback(() => {
    setEditingTask(null);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!userId || !editingTask) return;
    const title = editForm.title.trim();
    if (!title) return;
    setSaving(true);
    try {
      const updated = await patchTask(userId, editingTask.id, {
        title,
        description: editForm.description.trim() || null,
        type: editForm.type,
        priority: editForm.priority || null,
        dueDate: editForm.dueDate.trim() || null,
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === editingTask.id ? { ...t, ...updated } : t))
      );
      closeEdit();
    } catch (_) {
      Alert.alert('Error', 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }, [userId, editingTask, editForm, closeEdit]);

  const handleDelete = useCallback(
    async (task: Task) => {
      if (!userId) return;
      hapticFeedback.delete();
      Alert.alert('Delete task', `Delete "${task.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTask(userId, task.id);
              setTasks((prev) => prev.filter((t) => t.id !== task.id));
              if (editingTask?.id === task.id) {
                setEditingTask(null);
              }
            } catch (_) {
              Alert.alert('Error', 'Could not delete task.');
            }
          },
        },
      ]);
    },
    [userId, editingTask]
  );

  const handleDeleteInModal = useCallback(() => {
    if (!editingTask) return;
    handleDelete(editingTask);
  }, [editingTask, handleDelete]);

  if (!userId) {
    return (
      <View style={styles.centered}>
        <StickyCard backgroundColor={StickiesColors.yellow} softShadow style={styles.emptySticky}>
          <Text style={styles.emptyTitle}>Welcome!</Text>
          <Text style={styles.empty}>Sign in to start tracking your tasks.</Text>
        </StickyCard>
      </View>
    );
  }

  if (fetchError && tasks.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.centered, { flexGrow: 1 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={StickiesColors.inkMuted} />
        }
      >
        <StickyCard backgroundColor={StickiesColors.pink} softShadow style={styles.emptySticky}>
          <Text style={styles.errorTitle}>Could not load tasks</Text>
          <Text style={styles.empty}>{fetchError}</Text>
          <Text style={styles.hint}>Pull down to retry.</Text>
        </StickyCard>
      </ScrollView>
    );
  }

  if (loading && tasks.length === 0) {
    return (
      <View style={styles.centered}>
        <StickyCard backgroundColor={StickiesColors.blue} softShadow style={styles.emptySticky}>
          <Text style={styles.empty}>Loading…</Text>
        </StickyCard>
      </View>
    );
  }

  if (tasks.length === 0) {
    return (
      <View style={styles.centered}>
        <StickyCard backgroundColor={StickiesColors.yellow} softShadow style={styles.emptySticky}>
          <Text style={styles.emptyTitle}>All clear! ✨</Text>
          <Text style={styles.empty}>
            You don't have any tasks yet.{'\n\n'}
            Tap the + button on Home to record your thoughts, and we'll organize them into tasks for you.
          </Text>
        </StickyCard>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <Swipeable
            rightActions={[
              {
                label: 'Delete',
                icon: 'trash',
                color: StickiesColors.error,
                type: 'destructive',
                onPress: () => handleDelete(item),
              },
            ]}
            leftActions={
              !item.completed
                ? [
                    {
                      label: 'Complete',
                      icon: 'checkmark.circle.fill',
                      color: StickiesColors.success,
                      type: 'primary',
                      onPress: () => handleToggle(item.id, true),
                    },
                  ]
                : []
            }
          >
            <TaskCard
              task={item}
              onToggleComplete={handleToggle}
              onPress={openEdit}
              onLongPress={openEdit}
            />
          </Swipeable>
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      <Modal
        visible={!!editingTask}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeEdit}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeEdit}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit task</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={saving}>
              <Text style={[styles.modalSave, saving && styles.modalSaveDisabled]}>
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalLabel}>Title</Text>
            <TextInput
              style={styles.modalInput}
              value={editForm.title}
              onChangeText={(text) => setEditForm((f) => ({ ...f, title: text }))}
              placeholder="Task title"
              placeholderTextColor={StickiesColors.inkLight}
            />
            <Text style={styles.modalLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalInputMultiline]}
              value={editForm.description}
              onChangeText={(text) => setEditForm((f) => ({ ...f, description: text }))}
              placeholder="Details"
              placeholderTextColor={StickiesColors.inkLight}
              multiline
              numberOfLines={3}
            />
            <Text style={styles.modalLabel}>Due date (optional, YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              value={editForm.dueDate}
              onChangeText={(text) => setEditForm((f) => ({ ...f, dueDate: text }))}
              placeholder="2025-01-25"
              placeholderTextColor={StickiesColors.inkLight}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={styles.modalLabel}>Type</Text>
            <View style={styles.modalRow}>
              {(['task', 'reminder', 'note'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.modalChip,
                    editForm.type === t && styles.modalChipSelected,
                  ]}
                  onPress={() => setEditForm((f) => ({ ...f, type: t }))}
                >
                  <Text
                    style={[
                      styles.modalChipText,
                      editForm.type === t && styles.modalChipTextSelected,
                    ]}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.modalLabel}>Priority</Text>
            <View style={styles.modalRow}>
              {(['', 'low', 'medium', 'high'] as const).map((p) => (
                <TouchableOpacity
                  key={p || 'none'}
                  style={[
                    styles.modalChip,
                    editForm.priority === p && styles.modalChipSelected,
                  ]}
                  onPress={() => setEditForm((f) => ({ ...f, priority: p }))}
                >
                  <Text
                    style={[
                      styles.modalChipText,
                      editForm.priority === p && styles.modalChipTextSelected,
                    ]}
                  >
                    {p ? p.charAt(0).toUpperCase() + p.slice(1) : 'None'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.modalDeleteButton}
              onPress={handleDeleteInModal}
            >
              <Text style={styles.modalDeleteButtonText}>Delete task</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: StickiesColors.desk,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: StickiesColors.desk,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: StickiesColors.desk,
    padding: 24,
  },
  emptySticky: {
    maxWidth: 320,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: StickiesColors.ink,
    textAlign: 'center',
    marginBottom: 12,
  },
  empty: {
    fontSize: 16,
    lineHeight: 24,
    color: StickiesColors.inkMuted,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: StickiesColors.ink,
    marginBottom: 8,
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: StickiesColors.inkLight,
    textAlign: 'center',
    marginTop: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: StickiesColors.desk,
    paddingTop: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: StickiesColors.ink,
  },
  modalCancel: {
    fontSize: 16,
    color: StickiesColors.inkMuted,
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  modalSaveDisabled: {
    opacity: 0.5,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: StickiesColors.inkMuted,
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: StickiesColors.grayDark,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: StickiesColors.ink,
  },
  modalInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  modalChip: {
    marginRight: 8,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: StickiesColors.gray,
    borderWidth: 1,
    borderColor: StickiesColors.grayDark,
  },
  modalChipSelected: {
    backgroundColor: StickiesColors.blue,
    borderColor: StickiesColors.blueDark,
  },
  modalChipText: {
    fontSize: 14,
    color: StickiesColors.inkMuted,
  },
  modalChipTextSelected: {
    color: '#1e3a8a',
    fontWeight: '600',
  },
  modalDeleteButton: {
    marginTop: 24,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: StickiesColors.error,
    borderRadius: 10,
    backgroundColor: 'rgba(185, 28, 28, 0.08)',
  },
  modalDeleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: StickiesColors.error,
  },
});
