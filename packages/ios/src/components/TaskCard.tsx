/**
 * Task card: 3D pressed-button style, stepping-stone checkbox, mastered/jewel past.
 * Edit/Delete handled by Tasks screen. Haptic feedback and spring animations.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { StickiesColors, TypographyRounded, Spacing } from '../theme/stickies';
import { hapticFeedback } from '../utils/haptics';
import type { Task } from '../types';

const CARD_RADIUS = 16;
const BOTTOM_BORDER = 3;
const STONE_SIZE = 40;

interface TaskCardProps {
  task: Task;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
  onPress?: (task: Task) => void;
  onLongPress?: (task: Task) => void;
  rotation?: number;
}

function getCardColors(
  category: 'past' | 'today' | 'upcoming' | 'none',
  task: Task
): { bg: string; borderBottom: string; isMastered: boolean } {
  const isPast = category === 'past';
  const completed = task.completed;
  const isMastered = isPast || completed;

  if (category === 'today') {
    return {
      bg: StickiesColors.taskCardToday,
      borderBottom: StickiesColors.taskCardTodayBorder,
      isMastered: completed,
    };
  }
  if (category === 'upcoming') {
    return {
      bg: StickiesColors.taskCardUpcoming,
      borderBottom: StickiesColors.taskCardUpcomingBorder,
      isMastered: false,
    };
  }
  if (category === 'past') {
    return {
      bg: StickiesColors.taskCardPast,
      borderBottom: StickiesColors.taskCardPastBorder,
      isMastered: true,
    };
  }
  return {
    bg: StickiesColors.gray,
    borderBottom: StickiesColors.grayDark,
    isMastered: false,
  };
}

export function TaskCard({
  task,
  onToggleComplete,
  onPress,
  onLongPress,
  rotation = 0,
}: TaskCardProps) {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const due = dueDate
    ? dueDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  const category: 'past' | 'today' | 'upcoming' | 'none' = (() => {
    if (!dueDate) return 'upcoming';
    if (Number.isNaN(dueDate.getTime())) return 'upcoming';
    const toLocalYmd = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const today = new Date();
    const dueYmd = toLocalYmd(dueDate);
    const todayYmd = toLocalYmd(today);
    if (dueYmd < todayYmd) return 'past';
    if (dueYmd === todayYmd) return 'today';
    return 'upcoming';
  })();

  const { bg, borderBottom, isMastered } = getCardColors(category, task);

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
    if (task.completed) hapticFeedback.toggle();
    else hapticFeedback.complete();
    onToggleComplete?.(task.id, !task.completed);
  };

  const cardShadow =
    Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        }
      : { elevation: 4 };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bg,
          borderBottomWidth: BOTTOM_BORDER,
          borderBottomColor: borderBottom,
          borderRadius: CARD_RADIUS,
          transform: rotation !== 0 ? [{ rotate: `${rotation}deg` }] : undefined,
        },
        cardShadow,
      ]}
    >
      {isMastered ? (
        <View style={[styles.sheen, { borderTopLeftRadius: CARD_RADIUS, borderTopRightRadius: CARD_RADIUS }]} pointerEvents="none" />
      ) : null}
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
        <TouchableOpacity style={styles.stoneWrap} onPress={handleToggle} activeOpacity={0.85}>
          <View
            style={[
              styles.steppingStone,
              task.completed && styles.steppingStoneCompleted,
            ]}
          >
            <Animated.View style={checkboxAnimatedStyle}>
              <SymbolView
                name="checkmark"
                tintColor={task.completed ? StickiesColors.steppingStoneCompletedCheck : StickiesColors.inkLight}
                size={20}
                weight="bold"
                type="monochrome"
              />
            </Animated.View>
          </View>
        </TouchableOpacity>
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              task.completed && styles.titleCompleted,
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
          {task.description ? (
            <Text style={styles.desc} numberOfLines={2}>
              {task.description}
            </Text>
          ) : null}
          {due ? (
            <Text
              style={[
                styles.due,
                category === 'past' && styles.duePast,
                category === 'today' && styles.dueToday,
                category === 'upcoming' && styles.dueUpcoming,
              ]}
            >
              {due}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '40%',
    backgroundColor: StickiesColors.masteredSheen,
    borderBottomLeftRadius: CARD_RADIUS,
    borderBottomRightRadius: CARD_RADIUS,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stoneWrap: {
    marginRight: Spacing.md,
    marginTop: 2,
  },
  steppingStone: {
    width: STONE_SIZE,
    height: STONE_SIZE,
    borderRadius: STONE_SIZE / 2,
    backgroundColor: StickiesColors.steppingStoneDefault,
    borderWidth: 3,
    borderColor: StickiesColors.steppingStoneDefaultBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  steppingStoneCompleted: {
    backgroundColor: StickiesColors.steppingStoneCompleted,
    borderColor: StickiesColors.steppingStoneCompletedBorder,
  },
  content: {
    flex: 1,
  },
  title: {
    ...TypographyRounded.cardTitle,
    color: StickiesColors.ink,
  },
  titleCompleted: {
    ...TypographyRounded.cardTitleCompleted,
    textDecorationLine: 'line-through',
    color: StickiesColors.inkMuted,
  },
  desc: {
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkMuted,
    marginTop: Spacing.xs,
  },
  due: {
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkLight,
    marginTop: Spacing.sm,
  },
  duePast: {
    color: StickiesColors.error,
  },
  dueToday: {
    color: StickiesColors.ink,
  },
  dueUpcoming: {
    color: StickiesColors.inkMuted,
  },
});
