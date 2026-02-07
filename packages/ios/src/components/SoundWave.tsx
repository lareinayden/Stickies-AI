/**
 * Soundwave bars driven by real microphone level (metering in dBFS).
 * Keeps a rolling history so multiple bars show recent voice input.
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';

const BAR_COUNT = 9;
const BAR_WIDTH = 6;
const BAR_SPACING = 6;
const MIN_H = 8;
const MAX_H = 36;

/** dBFS -160 (silence) to 0 (max) -> 0..1 */
function dbToNormalized(db: number): number {
  const clamped = Math.max(-160, Math.min(0, db));
  return (clamped + 160) / 160;
}

interface SoundWaveProps {
  /** Current metering in dBFS (-160 to 0). When null, bars use fallback. */
  meteringDb: number | null;
}

export function SoundWave({ meteringDb }: SoundWaveProps) {
  const historyRef = useRef<number[]>(Array.from({ length: BAR_COUNT }, () => 0.2));
  const [heights, setHeights] = React.useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, () => MIN_H + 0.2 * (MAX_H - MIN_H))
  );

  useEffect(() => {
    if (meteringDb === null) return;
    const n = dbToNormalized(meteringDb);
    const prev = historyRef.current;
    const next = [...prev.slice(1), n];
    historyRef.current = next;
    setHeights(
      next.map((v) => MIN_H + v * (MAX_H - MIN_H))
    );
  }, [meteringDb]);

  return (
    <View style={styles.container}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            i > 0 ? styles.barSpacing : null,
            { height: h },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: MAX_H + 4,
    paddingVertical: 4,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: BAR_WIDTH / 2,
    backgroundColor: '#1c1917',
  },
  barSpacing: {
    marginLeft: BAR_SPACING,
  },
});
