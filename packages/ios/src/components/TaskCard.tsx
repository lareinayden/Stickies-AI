/**
 * Single task as a sticky note – color by type, paper shadow, checkbox.
 * Edit/Delete are handled by the Tasks screen (one Edit top-right, Remove in edit mode).
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StickyCard } from './StickyCard';
import { stickyColorForTaskType } from '../theme/stickies';
import type { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
  onPress?: (task: Task) => void;
  /** Slight rotation for sticky effect (e.g. -1, 0.5) */
  rotation?: number;
}

export function TaskCard({
  task,
  onToggleComplete,
  onPress,
  rotation = 0,
}: TaskCardProps) {
  const due = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;
  const bg = stickyColorForTaskType(task.type);

  return (
    <StickyCard backgroundColor={bg} softShadow style={styles.wrapper} rotation={rotation}>
      <TouchableOpacity
        style={styles.row}
        onPress={() => onPress?.(task)}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress}
      >
        <TouchableOpacity
          style={styles.toggle}
          onPress={() => onToggleComplete?.(task.id, !task.completed)}
        >
          <View style={[styles.checkbox, task.completed && styles.checkboxChecked]}>
            {task.completed ? <Text style={styles.check}>✓</Text> : null}
          </View>
        </TouchableOpacity>
        <View style={styles.content}>
          <Text
            style={[styles.title, task.completed && styles.titleCompleted]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
          {task.description ? (
            <Text style={styles.desc} numberOfLines={2}>
              {task.description}
            </Text>
          ) : null}
          {due ? <Text style={styles.due}>{due}</Text> : null}
        </View>
      </TouchableOpacity>
    </StickyCard>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  toggle: {
    marginRight: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#78716c',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  checkboxChecked: {
    backgroundColor: '#1c1917',
    borderColor: '#1c1917',
  },
  check: {
    color: '#fef9c3',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1c1917',
    lineHeight: 22,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#57534e',
  },
  desc: {
    fontSize: 14,
    color: '#57534e',
    marginTop: 4,
    lineHeight: 20,
  },
  due: {
    fontSize: 12,
    color: '#78716c',
    marginTop: 6,
  },
});
