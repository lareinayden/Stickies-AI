/**
 * Single task as a sticky note – color by type, paper shadow, checkbox.
 * Edit/Delete are handled by the Tasks screen (one Edit top-right, Remove in edit mode).
 * Includes haptic feedback and smooth animations.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { StickyCard } from './StickyCard';
import { stickyColorForTaskType, StickiesColors, Typography, Spacing } from '../theme/stickies';
import { hapticFeedback } from '../utils/haptics';
import type { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
  onPress?: (task: Task) => void;
  onLongPress?: (task: Task) => void;
  /** Slight rotation for sticky effect (e.g. -1, 0.5) */
  rotation?: number;
}

export function TaskCard({
  task,
  onToggleComplete,
  onPress,
  onLongPress,
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

  // Animated checkbox scale
  const checkboxScale = useSharedValue(task.completed ? 1 : 0);

  useEffect(() => {
    checkboxScale.value = withSpring(task.completed ? 1 : 0, {
      damping: 12,
      stiffness: 200,
    });
  }, [task.completed, checkboxScale]);

  const checkboxAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkboxScale.value }],
  }));

  const handleToggle = () => {
    // Haptic feedback based on completion state
    if (task.completed) {
      hapticFeedback.toggle();
    } else {
      hapticFeedback.complete();
    }
    onToggleComplete?.(task.id, !task.completed);
  };

  return (
    <StickyCard backgroundColor={bg} softShadow style={styles.wrapper} rotation={rotation}>
      <TouchableOpacity
        style={styles.row}
        onPress={() => {
          hapticFeedback.tap();
          onPress?.(task);
        }}
        onLongPress={() => {
          hapticFeedback.longPress();
          onLongPress?.(task);
        }}
        delayLongPress={500}
        activeOpacity={onPress || onLongPress ? 0.7 : 1}
        disabled={!onPress && !onLongPress}
      >
        <TouchableOpacity style={styles.toggle} onPress={handleToggle}>
          <View style={[styles.checkbox, task.completed && styles.checkboxChecked]}>
            <Animated.View style={checkboxAnimatedStyle}>
              <SymbolView
                name="checkmark"
                tintColor={StickiesColors.yellow}
                size={16}
                weight="bold"
                type="monochrome"
              />
            </Animated.View>
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
    marginBottom: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  toggle: {
    marginRight: Spacing.md,
    marginTop: 2,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: StickiesColors.inkLight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  checkboxChecked: {
    backgroundColor: StickiesColors.ink,
    borderColor: StickiesColors.ink,
  },
  content: {
    flex: 1,
  },
  title: {
    ...Typography.body,
    fontWeight: '600',
    color: StickiesColors.ink,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: StickiesColors.inkMuted,
  },
  desc: {
    ...Typography.subheadline,
    color: StickiesColors.inkMuted,
    marginTop: Spacing.xs,
  },
  due: {
    ...Typography.caption,
    color: StickiesColors.inkLight,
    marginTop: Spacing.sm,
  },
});
