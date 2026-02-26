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
import { SoundWave } from './SoundWave';
import { StickiesColors, TypographyRounded, Spacing } from '../theme/stickies';
import { hapticFeedback } from '../utils/haptics';

const CARD_RADIUS = 16;
const CARD_BORDER = 3;
const cardStyle = (bg: string, borderColor: string) => ({
  backgroundColor: bg,
  borderRadius: CARD_RADIUS,
  borderBottomWidth: CARD_BORDER,
  borderBottomColor: borderColor,
  padding: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
});

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

const ROUND_BUTTON_SIZE = 80;

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
      <View style={[cardStyle(StickiesColors.orange, StickiesColors.orangeDark)]}>
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
      </View>
    );
  }

  if (phase === 'done' || phase === 'error') {
    return (
      <View style={[cardStyle(StickiesColors.green, StickiesColors.greenDark)]}>
        <TouchableOpacity
          style={[styles.stickyBtn, styles.primaryBtn]}
          onPress={onReset}
          disabled={disabled}
        >
          <Text style={styles.primaryBtnLabel}>Record again</Text>
        </TouchableOpacity>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  if (busy) {
    return (
      <View style={[cardStyle(StickiesColors.blue, StickiesColors.blueBorder)]}>
        <View style={[styles.busyRow, styles.disabled]}>
          <ActivityIndicator color={StickiesColors.ink} size="small" />
          <Text style={[styles.primaryBtnLabel, { marginLeft: 10 }]}>
            {phase === 'uploading' ? 'Uploading…' : phase === 'transcribing' ? 'Transcribing…' : 'Summarizing…'}
          </Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
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
          size={36}
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
    borderBottomWidth: CARD_BORDER,
    borderBottomColor: StickiesColors.orangeDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  stickyBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md + 2,
    borderRadius: 12,
    borderBottomWidth: 2,
    minWidth: 140,
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: 'rgba(28,25,23,0.08)',
    borderBottomColor: 'rgba(28,25,23,0.12)',
  },
  primaryBtnLabel: {
    ...TypographyRounded.cardTitle,
    color: StickiesColors.ink,
  },
  stopBtn: {
    backgroundColor: StickiesColors.ink,
    borderBottomColor: '#1c1917',
  },
  stopBtnLabel: {
    ...TypographyRounded.cardTitle,
    color: StickiesColors.yellow,
  },
  cancelBtn: {
    backgroundColor: StickiesColors.grayDark,
    borderBottomColor: '#cbd5e1',
  },
  cancelBtnLabel: {
    ...TypographyRounded.cardTitle,
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
    ...TypographyRounded.cardMeta,
    color: StickiesColors.error,
    marginTop: 10,
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
    ...TypographyRounded.sectionHeader,
    color: StickiesColors.ink,
    fontVariant: ['tabular-nums'],
  },
  recordingActions: {
    flexDirection: 'row',
    alignSelf: 'center',
  },
});
