/**
 * Voice recorder: round button (idle), soundwave + controls (recording), sticky states (done/busy).
 * With SF Symbols, haptic feedback, and smooth animations.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { StickyCard } from './StickyCard';
import { SoundWave } from './SoundWave';
import { StickiesColors, Typography, Spacing } from '../theme/stickies';
import { hapticFeedback } from '../utils/haptics';

type Phase =
  | 'idle'
  | 'recording'
  | 'uploading'
  | 'transcribing'
  | 'summarizing'
  | 'done'
  | 'error';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface VoiceRecorderProps {
  phase: Phase;
  error: string | null;
  recordingDurationSeconds: number;
  /** Current mic level in dBFS (-160 to 0) for soundwave; null when not recording */
  meteringDb?: number | null;
  onStartRecord: () => void;
  onStopAndUpload: () => void;
  onCancelRecording: () => void;
  onReset?: () => void;
  disabled?: boolean;
}

const ROUND_BUTTON_SIZE = 96;

export function VoiceRecorder({
  phase,
  error,
  recordingDurationSeconds,
  meteringDb = null,
  onStartRecord,
  onStopAndUpload,
  onCancelRecording,
  onReset,
  disabled,
}: VoiceRecorderProps) {
  const busy =
    phase === 'uploading' ||
    phase === 'transcribing' ||
    phase === 'summarizing';
  const isRecording = phase === 'recording';

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isRecording) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.spring(pulseAnim, {
          toValue: 1.15,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(pulseAnim, {
          toValue: 0.88,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isRecording, pulseAnim]);

  if (isRecording) {
    return (
      <StickyCard backgroundColor={StickiesColors.orange} softShadow>
        <View style={styles.soundWaveWrap}>
          <SoundWave meteringDb={meteringDb} />
        </View>
        <View style={styles.recordingRow}>
          <Animated.View
            style={[styles.pulseDot, { transform: [{ scale: pulseAnim }] }]}
          />
          <Text style={[styles.duration, { marginLeft: 12 }]}>
            {formatDuration(recordingDurationSeconds)}
          </Text>
        </View>
        <View style={styles.recordingActions}>
          <TouchableOpacity
            style={[styles.stickyBtn, styles.cancelBtn, styles.cancelBtnMargin]}
            onPress={() => {
              hapticFeedback.press();
              onCancelRecording();
            }}
            disabled={disabled}
          >
            <Text style={styles.cancelBtnLabel}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stickyBtn, styles.stopBtn]}
            onPress={() => {
              hapticFeedback.success();
              onStopAndUpload();
            }}
            disabled={disabled}
          >
            <Text style={styles.stopBtnLabel}>Stop & Upload</Text>
          </TouchableOpacity>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </StickyCard>
    );
  }

  if (phase === 'done' || phase === 'error') {
    return (
      <StickyCard backgroundColor={StickiesColors.green} softShadow>
        <TouchableOpacity
          style={[styles.stickyBtn, styles.primaryBtn]}
          onPress={onReset}
          disabled={disabled}
        >
          <Text style={styles.primaryBtnLabel}>Record again</Text>
        </TouchableOpacity>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </StickyCard>
    );
  }

  if (busy) {
    return (
      <StickyCard backgroundColor={StickiesColors.blue} softShadow>
        <View style={[styles.busyRow, styles.disabled]}>
          <ActivityIndicator color={StickiesColors.ink} size="small" />
          <Text style={[styles.primaryBtnLabel, { marginLeft: 10 }]}>
            {phase === 'uploading' ? 'Uploading…' : phase === 'transcribing' ? 'Transcribing…' : 'Summarizing…'}
          </Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </StickyCard>
    );
  }

  return (
    <View style={styles.idleWrap}>
      <TouchableOpacity
        style={[styles.roundButton, disabled && styles.disabled]}
        onPress={() => {
          hapticFeedback.press();
          onStartRecord();
        }}
        disabled={disabled}
        activeOpacity={0.85}
      >
        <SymbolView
          name="mic.fill"
          tintColor={StickiesColors.ink}
          size={44}
          weight="medium"
          type="hierarchical"
        />
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  idleWrap: {
    alignItems: 'center',
  },
  roundButton: {
    width: ROUND_BUTTON_SIZE,
    height: ROUND_BUTTON_SIZE,
    borderRadius: ROUND_BUTTON_SIZE / 2,
    backgroundColor: StickiesColors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  stickyBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md + 2,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: 'rgba(28,25,23,0.08)',
  },
  primaryBtnLabel: {
    ...Typography.body,
    fontWeight: '600',
    color: StickiesColors.ink,
  },
  stopBtn: {
    backgroundColor: StickiesColors.ink,
  },
  stopBtnLabel: {
    ...Typography.body,
    fontWeight: '600',
    color: StickiesColors.yellow,
  },
  cancelBtn: {
    backgroundColor: StickiesColors.grayDark,
  },
  cancelBtnLabel: {
    ...Typography.body,
    fontWeight: '600',
    color: StickiesColors.inkMuted,
  },
  cancelBtnMargin: {
    marginRight: Spacing.md,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  disabled: {
    opacity: 0.7,
  },
  error: {
    color: StickiesColors.error,
    marginTop: 10,
    fontSize: 14,
  },
  soundWaveWrap: {
    minHeight: 48,
    marginBottom: 4,
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  pulseDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: StickiesColors.ink,
  },
  duration: {
    fontSize: 26,
    fontWeight: '700',
    color: StickiesColors.ink,
    fontVariant: ['tabular-nums'],
  },
  recordingActions: {
    flexDirection: 'row',
    alignSelf: 'center',
  },
});
