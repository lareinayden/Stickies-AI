/**
 * Reusable sticky-note style card: pastel background, shadow, rounded corners.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { StickiesShadow } from '../theme/stickies';

interface StickyCardProps {
  children: React.ReactNode;
  backgroundColor: string;
  style?: ViewStyle;
  /** Slight rotation in degrees (e.g. -1.5 for sticky look) */
  rotation?: number;
  /** Softer shadow */
  softShadow?: boolean;
}

export function StickyCard({
  children,
  backgroundColor,
  style,
  rotation = 0,
  softShadow,
}: StickyCardProps) {
  const shadow = softShadow
    ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }
    : StickiesShadow;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor, ...shadow },
        rotation !== 0 && { transform: [{ rotate: `${rotation}deg` }] },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    minHeight: 48,
  },
});
