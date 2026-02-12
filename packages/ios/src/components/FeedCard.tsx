/**
 * Single card in the vertical paging feed: 80% screen height, 20px radius,
 * pastel background, and liquid scale transition.
 */

import React from 'react';
import { View, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { StickiesColors } from '../theme/stickies';

const CARD_RADIUS = 20;
const PremiumShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 3,
};

export const CARD_HEIGHT_RATIO = 0.8;

export function feedCardHeight(): number {
  const { height } = Dimensions.get('window');
  return height * CARD_HEIGHT_RATIO;
}

const CARD_COLORS: string[] = [
  StickiesColors.blue,
  StickiesColors.yellow,
  StickiesColors.pink,
  StickiesColors.purple,
  StickiesColors.green,
  StickiesColors.orange,
];

interface FeedCardProps {
  children: React.ReactNode;
  index: number;
  scrollOffset: SharedValue<number>;
  cardHeight: number;
  style?: ViewStyle;
}

export function FeedCard({
  children,
  index,
  scrollOffset,
  cardHeight,
  style,
}: FeedCardProps) {
  const backgroundColor = CARD_COLORS[index % CARD_COLORS.length];

  const animatedStyle = useAnimatedStyle(() => {
    const offset = scrollOffset.value;
    const cardTop = index * cardHeight;
    const progress = Math.max(
      0,
      Math.min(1, (offset - cardTop + cardHeight) / cardHeight)
    );
    const scale = 0.9 + 0.1 * progress;
    return {
      transform: [{ scale }],
    };
  }, [index, cardHeight]);

  return (
    <Animated.View
      style={[
        styles.outer,
        { height: cardHeight },
        animatedStyle,
        style,
      ]}
    >
      <View style={[styles.card, { backgroundColor }]}>
        <View style={styles.content}>{children}</View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    flex: 1,
    width: '100%',
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    ...PremiumShadow,
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
    justifyContent: 'center',
  },
});
