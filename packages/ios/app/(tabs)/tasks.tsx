import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../src/hooks/useAuth';
import { TaskCard } from '../../src/components/TaskCard';
import { StickyCard } from '../../src/components/StickyCard';
import { Swipeable } from '../../src/components/Swipeable';
import { getTasks, updateTask, patchTask, deleteTask } from '../../src/api/client';
import { StickiesColors, TypographyRounded } from '../../src/theme/stickies';
import { hapticFeedback } from '../../src/utils/haptics';
import { triggerRewardsRefresh } from '../../src/utils/rewards-refresh';
import type { Task } from '../../src/types';

export default function Tasks() {
  const { userId } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    type: 'task' as 'task' | 'reminder' | 'note',
    priority: '' as '' | 'low' | 'medium' | 'high',
  });
  const [saving, setSaving] = useState(false);

  const groupedSections = useMemo(() => {
    if (tasks.length === 0) return [];

    const todayTasks: Task[] = [];
    const upcomingTasks: Task[] = [];
    const pastTasks: Task[] = [];

    const toLocalYmd = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const todayYmd = toLocalYmd(new Date());

    for (const t of tasks) {
      if (!t.dueDate) {
        upcomingTasks.push(t);
        continue;
      }
      const due = new Date(t.dueDate);
      if (Number.isNaN(due.getTime())) {
        upcomingTasks.push(t);
        continue;
      }
      const dueYmd = toLocalYmd(due);
      if (dueYmd < todayYmd) {
        pastTasks.push(t);
      } else if (dueYmd === todayYmd) {
        todayTasks.push(t);
      } else {
        upcomingTasks.push(t);
      }
    }

    const sections: Array<{ key: string; title: string; data: Task[] }> = [];
    const sortIncompleteFirst = (a: Task, b: Task) =>
      a.completed === b.completed ? 0 : a.completed ? 1 : -1;
    if (todayTasks.length) {
      sections.push({
        key: 'today',
        title: 'Today',
        data: [...todayTasks].sort(sortIncompleteFirst),
      });
    }
    if (upcomingTasks.length) {
      sections.push({
        key: 'upcoming',
        title: 'Upcoming',
        data: [...upcomingTasks].sort(sortIncompleteFirst),
      });
    }
    if (pastTasks.length) {
      sections.push({
        key: 'past',
        title: 'Past',
        data: [...pastTasks].sort(sortIncompleteFirst),
      });
    }
    return sections;
  }, [tasks]);

  const load = useCallback(async () => {
    if (!userId) return;
    setFetchError(null);
    setLoading(true);
    try {
      const { tasks: list } = await getTasks(userId);
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
      load();
    }, [load])
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
            t.id === taskId
              ? { ...t, completed, completedAt: completed ? new Date().toISOString() : null }
              : t
          )
        );
        if (completed) {
          triggerRewardsRefresh();
        }
      } catch (_) {}
    },
    [userId]
  );

  const openEdit = useCallback((task: Task) => {
    setEditingTask(task);
    const d = task.dueDate ? new Date(task.dueDate) : null;
    const dueDate = d
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      : '';
    const dueTime = d
      ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      : '';
    setEditForm({
      title: task.title,
      description: task.description ?? '',
      dueDate,
      dueTime,
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
      let dueDateValue: string | null = null;
      if (editForm.dueDate.trim()) {
        const raw = editForm.dueTime.trim() || '00:00';
        const match = raw.match(/^(\d{1,2}):(\d{2})$/);
        const hours = match ? String(parseInt(match[1], 10)).padStart(2, '0') : '00';
        const minutes = match ? match[2] : '00';
        dueDateValue = `${editForm.dueDate.trim()}T${hours}:${minutes}:00`;
      }
      const updated = await patchTask(userId, editingTask.id, {
        title,
        description: editForm.description.trim() || null,
        type: editForm.type,
        priority: editForm.priority || null,
        dueDate: dueDateValue,
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
      <SectionList
        sections={groupedSections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
          </View>
        )}
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
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalBodyContent}>
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
            <Text style={styles.modalLabel}>Due time (optional, HH:mm)</Text>
            <TextInput
              style={styles.modalInput}
              value={editForm.dueTime}
              onChangeText={(text) => setEditForm((f) => ({ ...f, dueTime: text }))}
              placeholder="18:00"
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
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 32,
    backgroundColor: StickiesColors.desk,
  },
  sectionHeaderContainer: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    ...TypographyRounded.sectionHeader,
    color: StickiesColors.ink,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: StickiesColors.desk,
    padding: 24,
  },
  emptySticky: {
    maxWidth: 300,
    alignItems: 'center',
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '600',
    color: StickiesColors.ink,
    textAlign: 'center',
    marginBottom: 10,
  },
  empty: {
    fontSize: 15,
    lineHeight: 22,
    color: StickiesColors.inkMuted,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: StickiesColors.ink,
    marginBottom: 6,
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    color: StickiesColors.inkLight,
    textAlign: 'center',
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: StickiesColors.desk,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    paddingBottom: 14,
    borderBottomWidth: 3,
    borderBottomColor: StickiesColors.grayDark,
    backgroundColor: StickiesColors.deskAlt,
  },
  modalTitle: {
    ...TypographyRounded.sectionHeader,
    fontSize: 20,
    lineHeight: 26,
    color: StickiesColors.ink,
  },
  modalCancel: {
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkMuted,
  },
  modalSave: {
    ...TypographyRounded.cardMeta,
    fontWeight: '700',
    color: StickiesColors.success,
  },
  modalSaveDisabled: {
    opacity: 0.5,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 18,
    paddingBottom: 32,
  },
  modalLabel: {
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkMuted,
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: '#fff',
    borderWidth: 0,
    borderBottomWidth: 3,
    borderBottomColor: StickiesColors.grayDark,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    color: StickiesColors.ink,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  modalInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 10,
  },
  modalChip: {
    marginRight: 8,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: StickiesColors.gray,
    borderBottomWidth: 2,
    borderBottomColor: StickiesColors.grayDark,
    borderWidth: 0,
  },
  modalChipSelected: {
    backgroundColor: StickiesColors.taskCardUpcoming,
    borderBottomColor: StickiesColors.taskCardUpcomingBorder,
  },
  modalChipText: {
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkMuted,
  },
  modalChipTextSelected: {
    color: StickiesColors.ink,
    fontWeight: '700',
  },
  modalDeleteButton: {
    marginTop: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderBottomWidth: 3,
    borderBottomColor: StickiesColors.error,
    borderRadius: 16,
    backgroundColor: 'rgba(185, 28, 28, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  modalDeleteButtonText: {
    ...TypographyRounded.cardTitle,
    fontSize: 15,
    color: StickiesColors.error,
  },
});
