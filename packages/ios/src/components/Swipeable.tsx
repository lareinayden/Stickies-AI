/**
 * iOS-style swipeable component for swipe actions
 * Supports swipe-to-delete, swipe-to-complete, etc.
 */

import React, { useRef } from 'react';
import { Animated, StyleSheet, View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { RectButton, Swipeable as RNGHSwipeable } from 'react-native-gesture-handler';
import { SymbolView } from 'expo-symbols';
import { StickiesColors, Typography } from '../theme/stickies';
import { hapticFeedback } from '../utils/haptics';

export interface SwipeAction {
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
  type?: 'destructive' | 'primary' | 'secondary';
}

interface SwipeableProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  style?: ViewStyle;
}

export function Swipeable({ children, leftActions, rightActions, style }: SwipeableProps) {
  const swipeableRef = useRef<RNGHSwipeable>(null);

  const renderActions = (
    actions: SwipeAction[],
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
    side: 'left' | 'right'
  ) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [side === 'left' ? -80 : 80, 0],
    });

    return (
      <View style={[styles.actionsContainer, side === 'left' && styles.leftActions]}>
        {actions.map((action, index) => {
          const getBackgroundColor = () => {
            switch (action.type) {
              case 'destructive':
                return StickiesColors.error;
              case 'primary':
                return StickiesColors.success;
              default:
                return StickiesColors.inkMuted;
            }
          };

          return (
            <Animated.View
              key={index}
              style={[
                styles.actionWrapper,
                {
                  transform: [{ translateX: trans }],
                },
              ]}
            >
              <RectButton
                style={[styles.action, { backgroundColor: getBackgroundColor() }]}
                onPress={() => {
                  hapticFeedback.swipe();
                  action.onPress();
                  swipeableRef.current?.close();
                }}
              >
                <SymbolView
                  name={action.icon}
                  tintColor="#fff"
                  size={22}
                  weight="medium"
                  type="monochrome"
                />
                <Text style={styles.actionLabel}>{action.label}</Text>
              </RectButton>
            </Animated.View>
          );
        })}
      </View>
    );
  };

  return (
    <RNGHSwipeable
      ref={swipeableRef}
      friction={2}
      leftThreshold={30}
      rightThreshold={30}
      renderLeftActions={
        leftActions && leftActions.length > 0
          ? (progress, dragX) => renderActions(leftActions, progress, dragX, 'left')
          : undefined
      }
      renderRightActions={
        rightActions && rightActions.length > 0
          ? (progress, dragX) => renderActions(rightActions, progress, dragX, 'right')
          : undefined
      }
      overshootLeft={false}
      overshootRight={false}
      containerStyle={style}
    >
      {children}
    </RNGHSwipeable>
  );
}

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
  },
  leftActions: {
    marginRight: 12,
  },
  actionWrapper: {
    justifyContent: 'center',
  },
  action: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    paddingHorizontal: 12,
  },
  actionLabel: {
    ...Typography.caption,
    color: '#fff',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});
