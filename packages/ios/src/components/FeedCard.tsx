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

const CARD_RADIUS = 16;
const BOTTOM_BORDER = 3;
const PremiumShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.07,
  shadowRadius: 6,
  elevation: 3,
};

export const CARD_HEIGHT_RATIO = 0.8;

export function feedCardHeight(): number {
  const { height } = Dimensions.get('window');
  return height * CARD_HEIGHT_RATIO;
}

const CARD_COLORS: string[] = [
  StickiesColors.taskCardToday,
  StickiesColors.taskCardUpcoming,
  StickiesColors.taskCardPast,
  StickiesColors.blue,
];

const CARD_BORDER_COLORS: string[] = [
  StickiesColors.taskCardTodayBorder,
  StickiesColors.taskCardUpcomingBorder,
  StickiesColors.taskCardPastBorder,
  StickiesColors.blueBorder,
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
  const borderBottomColor = CARD_BORDER_COLORS[index % CARD_BORDER_COLORS.length];

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
      <View style={[styles.card, { backgroundColor, borderBottomWidth: BOTTOM_BORDER, borderBottomColor }]}>
        <View style={styles.content}>{children}</View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    paddingHorizontal: 18,
    paddingVertical: 10,
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
    padding: 16,
    justifyContent: 'center',
  },
});
