/**
 * Single task row – title, optional due date, completed toggle.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
}

export function TaskCard({ task, onToggleComplete }: TaskCardProps) {
  const due = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <View style={[styles.card, task.completed && styles.completed]}>
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => onToggleComplete?.(task.id, !task.completed)}
      >
        <View style={[styles.checkbox, task.completed && styles.checkboxChecked]}>
          {task.completed ? <Text style={styles.check}>✓</Text> : null}
        </View>
      </TouchableOpacity>
      <View style={styles.content}>
        <Text style={[styles.title, task.completed && styles.titleCompleted]} numberOfLines={2}>
          {task.title}
        </Text>
        {task.description ? (
          <Text style={styles.desc} numberOfLines={1}>
            {task.description}
          </Text>
        ) : null}
        {due ? <Text style={styles.due}>{due}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  completed: {
    opacity: 0.7,
  },
  toggle: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  check: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  desc: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  due: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
});
