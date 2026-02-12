/**
 * Soft, moving mesh gradient background drawn with React Native Skia.
 * Used as card background for the vertical paging feed.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Rect,
  RadialGradient,
  vec,
  useClock,
} from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

const CARD_RADIUS = 20;

interface MeshGradientBackgroundProps {
  width: number;
  height: number;
  /** Base pastel colors for the mesh (default: soft blue, pink, yellow) */
  colors?: [string, string, string];
}

export function MeshGradientBackground({
  width,
  height,
  colors = ['#dbeafe', '#fce7f3', '#fef9c3'],
}: MeshGradientBackgroundProps) {
  const clock = useClock();

  const c1 = useDerivedValue(() => {
    'worklet';
    const t = clock.value / 2000;
    return vec(
      width * (0.2 + 0.15 * Math.sin(t)),
      height * (0.25 + 0.2 * Math.cos(t * 0.7))
    );
  }, [width, height]);

  const c2 = useDerivedValue(() => {
    'worklet';
    const t = clock.value / 2500;
    return vec(
      width * (0.75 + 0.2 * Math.cos(t * 0.9)),
      height * (0.6 + 0.15 * Math.sin(t * 0.8))
    );
  }, [width, height]);

  const c3 = useDerivedValue(() => {
    'worklet';
    const t = clock.value / 3000;
    return vec(
      width * (0.5 + 0.25 * Math.sin(t * 0.6)),
      height * (0.8 + 0.1 * Math.cos(t))
    );
  }, [width, height]);

  if (width <= 0 || height <= 0) return null;

  const r = Math.max(width, height) * 0.8;

  return (
    <View style={[StyleSheet.absoluteFill, { width, height }]}>
      <Canvas style={[StyleSheet.absoluteFill, { width, height }]}>
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={c1}
            r={r}
            colors={[colors[0], `${colors[0]}00`]}
            positions={[0, 1]}
          />
        </Rect>
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={c2}
            r={r}
            colors={[colors[1], `${colors[1]}00`]}
            positions={[0, 1]}
          />
        </Rect>
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={c3}
            r={r}
            colors={[colors[2], `${colors[2]}00`]}
            positions={[0, 1]}
          />
        </Rect>
      </Canvas>
    </View>
  );
}
