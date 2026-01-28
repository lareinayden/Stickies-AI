/**
 * Record button and status for voice capture.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

type Phase =
  | 'idle'
  | 'recording'
  | 'uploading'
  | 'transcribing'
  | 'summarizing'
  | 'done'
  | 'error';

const labels: Record<Phase, string> = {
  idle: 'Tap to record',
  recording: 'Recording in progress',
  uploading: 'Uploading…',
  transcribing: 'Transcribing…',
  summarizing: 'Summarizing…',
  done: 'Done',
  error: 'Error',
};

interface VoiceRecorderProps {
  phase: Phase;
  error: string | null;
  onRecord: () => void;
  onReset?: () => void;
  disabled?: boolean;
}

export function VoiceRecorder({
  phase,
  error,
  onRecord,
  onReset,
  disabled,
}: VoiceRecorderProps) {
  const busy =
    phase === 'recording' ||
    phase === 'uploading' ||
    phase === 'transcribing' ||
    phase === 'summarizing';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          phase === 'recording' && styles.recording,
          (disabled || busy) && styles.disabled,
        ]}
        onPress={busy ? undefined : phase === 'done' || phase === 'error' ? onReset : onRecord}
        disabled={disabled}
      >
        {busy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={[styles.buttonLabel, { marginLeft: 10 }]}>{labels[phase]}</Text>
          </View>
        ) : (
          <Text style={styles.buttonLabel}>
            {phase === 'done' || phase === 'error' ? 'Record again' : labels[phase]}
          </Text>
        )}
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 220,
    alignItems: 'center',
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recording: {
    backgroundColor: '#dc2626',
  },
  disabled: {
    opacity: 0.6,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#dc2626',
    marginTop: 8,
    fontSize: 14,
  },
});
