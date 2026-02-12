/**
 * Tap-to-flip card (front/back) using Reanimated.
 * - Front is shown by default
 * - Tap toggles to back, tap again toggles to front
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export type FlipCardSide = 'front' | 'back';

export interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  /** Optional controlled initial side (default: front) */
  initialSide?: FlipCardSide;
  /** Disable flipping interaction */
  disabled?: boolean;
  /** Card container style (size, margins, etc.) */
  style?: ViewStyle;
  /** Inner card style (background, radius, padding, etc.) */
  cardStyle?: ViewStyle;
  borderRadius?: number;
  durationMs?: number;
  onSideChange?: (side: FlipCardSide) => void;
  testID?: string;
}

export function FlipCard({
  front,
  back,
  initialSide = 'front',
  disabled,
  style,
  cardStyle,
  borderRadius = 20,
  durationMs = 420,
  onSideChange,
  testID,
}: FlipCardProps) {
  const [side, setSide] = useState<FlipCardSide>(initialSide);

  const progress = useSharedValue(initialSide === 'back' ? 1 : 0);

  const flipTo = useCallback(
    (next: FlipCardSide) => {
      setSide(next);
      onSideChange?.(next);
      progress.value = withTiming(next === 'back' ? 1 : 0, {
        duration: durationMs,
      });
    },
    [durationMs, onSideChange, progress]
  );

  const onPress = useCallback(() => {
    if (disabled) return;
    flipTo(side === 'front' ? 'back' : 'front');
  }, [disabled, flipTo, side]);

  const common = useMemo(
    () => ({
      borderRadius,
    }),
    [borderRadius]
  );

  const frontStyle = useAnimatedStyle(() => {
    const rotate = interpolate(progress.value, [0, 1], [0, 180]);
    // prevent mirrored text around the half-way point
    const opacity = interpolate(progress.value, [0, 0.499, 0.5, 1], [1, 1, 0, 0]);
    return {
      opacity,
      transform: [{ perspective: 1000 }, { rotateY: `${rotate}deg` }],
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotate = interpolate(progress.value, [0, 1], [180, 360]);
    const opacity = interpolate(progress.value, [0, 0.499, 0.5, 1], [0, 0, 1, 1]);
    return {
      opacity,
      transform: [{ perspective: 1000 }, { rotateY: `${rotate}deg` }],
    };
  });

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Flip card"
      accessibilityHint="Tap to flip"
      accessibilityValue={{ text: side === 'front' ? 'Front' : 'Back' }}
      testID={testID}
      style={style}
    >
      <View style={[styles.card, common, cardStyle]}>
        <Animated.View
          testID={testID ? `${testID}-front` : undefined}
          style={[styles.face, common, frontStyle]}
        >
          {front}
        </Animated.View>
        <Animated.View
          testID={testID ? `${testID}-back` : undefined}
          style={[styles.face, common, backStyle]}
        >
          {back}
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  face: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: 'hidden',
  },
});

