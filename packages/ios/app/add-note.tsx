/**
 * Add note / add content flow: voice or type, then extract tasks or create learning area.
 * Opened from the main feed FAB.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VoiceRecorder } from '../src/components/VoiceRecorder';
import { StickyCard } from '../src/components/StickyCard';
import { useVoiceUpload } from '../src/hooks/useVoiceUpload';
import {
  createTasksFromText,
  generateLearningStickies,
} from '../src/api/client';
import { StickiesColors, StickiesShadowSoft } from '../src/theme/stickies';

const USER_KEY = 'stickies_user_id';

type InputMode = 'voice' | 'type';

export default function AddNote() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [textInput, setTextInput] = useState('');
  const [processingTasks, setProcessingTasks] = useState(false);
  const [processingLearn, setProcessingLearn] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);

  const {
    phase,
    error,
    transcript,
    recordingDurationSeconds,
    meteringDb,
    startRecording,
    stopAndUpload,
    cancelRecording,
    reset,
    extractTasksFromVoice,
  } = useVoiceUpload(userId);

  useEffect(() => {
    AsyncStorage.getItem(USER_KEY).then(setUserId);
  }, []);

  const content = inputMode === 'voice' ? (transcript ?? '') : textInput.trim();
  const hasContent = content.length > 0;

  const handleExtractTasks = useCallback(async () => {
    if (!hasContent || !userId) return;
    setProcessingTasks(true);
    setHomeError(null);
    try {
      if (inputMode === 'voice') {
        await extractTasksFromVoice();
      } else {
        const result = await createTasksFromText(userId, content);
        if (result.tasksCreated > 0) setTextInput('');
      }
      router.back();
      router.push('/(tabs)/tasks');
    } catch (e) {
      setHomeError(e instanceof Error ? e.message : 'Failed to extract tasks');
    } finally {
      setProcessingTasks(false);
    }
  }, [hasContent, userId, inputMode, content, extractTasksFromVoice, router]);

  const handleCreateLearningArea = useCallback(async () => {
    if (!hasContent || !userId) return;
    setProcessingLearn(true);
    setHomeError(null);
    try {
      await generateLearningStickies(userId, content);
      if (inputMode === 'type') setTextInput('');
      router.back();
      router.push('/(tabs)/learning-stickies');
    } catch (e) {
      setHomeError(e instanceof Error ? e.message : 'Failed to create learning area');
    } finally {
      setProcessingLearn(false);
    }
  }, [hasContent, userId, inputMode, content, router]);

  return (
    <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.scrollSection}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>Add tasks or learn something</Text>
          <Text style={styles.pageSubtitle}>Use voice or type below, then choose what to do.</Text>

          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segment, styles.segmentLeft, inputMode === 'voice' && styles.segmentActive]}
              onPress={() => setInputMode('voice')}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, inputMode === 'voice' && styles.segmentTextActive]}>Voice</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, styles.segmentRight, inputMode === 'type' && styles.segmentActive]}
              onPress={() => setInputMode('type')}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, inputMode === 'type' && styles.segmentTextActive]}>Type</Text>
            </TouchableOpacity>
          </View>

          {inputMode === 'voice' && (
            <View style={styles.recordSection}>
              <VoiceRecorder
                phase={phase}
                error={error}
                recordingDurationSeconds={recordingDurationSeconds}
                meteringDb={meteringDb}
                onStartRecord={startRecording}
                onStopAndUpload={stopAndUpload}
                onCancelRecording={cancelRecording}
                onReset={reset}
                disabled={!userId}
              />
            </View>
          )}

          {inputMode === 'type' && (
            <StickyCard backgroundColor={StickiesColors.yellow} softShadow style={styles.typeCard}>
              <Text style={styles.typePlaceholder}>Describe tasks or what you want to learn…</Text>
              <TextInput
                style={styles.typeInput}
                value={textInput}
                onChangeText={(t) => {
                  setTextInput(t);
                  setHomeError(null);
                }}
                placeholder="e.g. Buy groceries tomorrow at 10am. I want to learn React hooks."
                placeholderTextColor={StickiesColors.inkLight}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!!userId}
              />
            </StickyCard>
          )}

          {hasContent && (
            <View style={styles.actionsCard}>
              <Text style={styles.actionsTitle}>What would you like to do?</Text>
              <TouchableOpacity
                style={[styles.primaryButton, styles.primaryButtonTasks, processingTasks && styles.primaryButtonDisabled]}
                onPress={handleExtractTasks}
                disabled={processingTasks}
                activeOpacity={0.85}
              >
                {processingTasks ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Extract tasks</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, styles.primaryButtonLearn, processingLearn && styles.primaryButtonDisabled]}
                onPress={handleCreateLearningArea}
                disabled={processingLearn}
                activeOpacity={0.85}
              >
                {processingLearn ? (
                  <ActivityIndicator size="small" color={StickiesColors.ink} />
                ) : (
                  <Text style={styles.primaryButtonLearnText}>Create learning area</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {(homeError || (inputMode === 'voice' && error)) ? (
            <StickyCard backgroundColor={StickiesColors.pink} softShadow style={styles.errorCard}>
              <Text style={styles.errorText}>{homeError || error}</Text>
            </StickyCard>
          ) : null}

          {inputMode === 'voice' && transcript ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Transcript</Text>
              <StickyCard backgroundColor={StickiesColors.blue} softShadow style={styles.transcriptCard}>
                <Text style={styles.transcript}>{transcript}</Text>
              </StickyCard>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: StickiesColors.desk },
  scrollSection: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: StickiesColors.ink, marginBottom: 6 },
  pageSubtitle: { fontSize: 15, color: StickiesColors.inkMuted, marginBottom: 20, lineHeight: 22 },
  segmentedControl: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: StickiesColors.grayDark,
    borderRadius: 12,
    padding: 4,
  },
  segment: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  segmentLeft: { marginRight: 2 },
  segmentRight: { marginLeft: 2 },
  segmentActive: { backgroundColor: '#fff', ...StickiesShadowSoft },
  segmentText: { fontSize: 16, fontWeight: '600', color: StickiesColors.inkMuted },
  segmentTextActive: { color: StickiesColors.ink },
  recordSection: { marginBottom: 20, alignItems: 'center' },
  typeCard: { padding: 16, marginBottom: 20, minHeight: 140 },
  typePlaceholder: { fontSize: 13, color: StickiesColors.inkLight, marginBottom: 8 },
  typeInput: { fontSize: 16, color: StickiesColors.ink, padding: 0, minHeight: 80, lineHeight: 24 },
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: StickiesColors.grayDark,
    ...StickiesShadowSoft,
  },
  actionsTitle: { fontSize: 15, fontWeight: '600', color: StickiesColors.inkMuted, marginBottom: 14 },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonTasks: { backgroundColor: StickiesColors.blue },
  primaryButtonLearn: { backgroundColor: StickiesColors.orange },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { fontSize: 17, fontWeight: '600', color: '#1e3a8a' },
  primaryButtonLearnText: { fontSize: 17, fontWeight: '600', color: StickiesColors.ink },
  errorCard: { marginBottom: 20, padding: 16 },
  errorText: { fontSize: 15, color: StickiesColors.error, lineHeight: 22 },
  section: { marginTop: 28 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: StickiesColors.inkLight,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  transcriptCard: { padding: 16 },
  transcript: { fontSize: 16, color: StickiesColors.ink, lineHeight: 24 },
});
