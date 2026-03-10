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
import { useAuth } from '../src/hooks/useAuth';
import { VoiceRecorder } from '../src/components/VoiceRecorder';
import { useVoiceUpload } from '../src/hooks/useVoiceUpload';
import {
  createTasksFromText,
  generateLearningStickies,
} from '../src/api/client';
import { StickiesColors, TypographyRounded } from '../src/theme/stickies';

const CARD_RADIUS = 16;
const CARD_BORDER = 3;
const SECTION_SPACING = 24;

const cardStyle = (bg: string, borderColor: string) => ({
  backgroundColor: bg,
  borderRadius: CARD_RADIUS,
  borderBottomWidth: CARD_BORDER,
  borderBottomColor: borderColor,
  padding: 16,
  minHeight: 48,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.04,
  shadowRadius: 3,
  elevation: 1,
});

type InputMode = 'voice' | 'type';

export default function AddNote() {
  const router = useRouter();
  const { userId } = useAuth();
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
      const raw = e instanceof Error ? e.message : 'Failed to extract tasks';
      const friendly =
        /JSON|Parse|Unexpected character|Could not load|failed:|fetch/i.test(raw)
          ? "We couldn't extract tasks right now. Please check your connection and try again."
          : raw;
      setHomeError(friendly);
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
      const raw = e instanceof Error ? e.message : 'Failed to create learning area';
      const friendly =
        /JSON|Parse|Unexpected character|Could not load|failed:|fetch/i.test(raw)
          ? "We couldn't create the learning area right now. Please check your connection and try again."
          : raw;
      setHomeError(friendly);
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
          <Text style={styles.pageTitle}>What's on your mind?</Text>
          <Text style={styles.pageSubtitle}>Say it or type it to capture your idea.</Text>

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
            <View style={[styles.recordSection, { marginBottom: SECTION_SPACING }]}>
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
            <View style={[cardStyle(StickiesColors.yellow, StickiesColors.yellowDark), styles.typeCard, { marginBottom: SECTION_SPACING }]}>
              <Text style={styles.typePlaceholder}>Describe tasks or what you want to learn…</Text>
              <TextInput
                style={styles.typeInput}
                value={textInput}
                onChangeText={(t) => {
                  setTextInput(t);
                  setHomeError(null);
                }}
                placeholder={'e.g. Buy groceries tomorrow at 10am.\nI want to learn React hooks.'}
                placeholderTextColor={StickiesColors.inkLight}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!!userId}
              />
            </View>
          )}

          {inputMode === 'voice' && transcript ? (
            <View style={[styles.section, { marginBottom: SECTION_SPACING }]}>
              <Text style={styles.sectionLabel}>Captured note</Text>
              <View style={[cardStyle(StickiesColors.blue, StickiesColors.blueBorder), styles.transcriptCard]}>
                <Text style={styles.transcript}>"{transcript}"</Text>
              </View>
            </View>
          ) : null}

          {inputMode === 'type' && hasContent ? (
            <View style={[styles.section, { marginBottom: SECTION_SPACING }]}>
              <Text style={styles.sectionLabel}>Captured note</Text>
              <View style={[cardStyle(StickiesColors.blue, StickiesColors.blueBorder), styles.transcriptCard]}>
                <Text style={styles.transcript}>"{content}"</Text>
              </View>
            </View>
          ) : null}

          {hasContent && (
            <View style={styles.actionsSection}>
              <Text style={styles.actionsTitle}>What should we do with this note?</Text>
              <TouchableOpacity
                style={[styles.primaryButton, styles.primaryButtonTasks, processingTasks && styles.primaryButtonDisabled]}
                onPress={handleExtractTasks}
                disabled={processingTasks}
                activeOpacity={0.85}
              >
                {processingTasks ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>✓  Extract Tasks</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, processingLearn && styles.primaryButtonDisabled]}
                onPress={handleCreateLearningArea}
                disabled={processingLearn}
                activeOpacity={0.85}
              >
                {processingLearn ? (
                  <ActivityIndicator size="small" color={StickiesColors.ink} />
                ) : (
                  <Text style={styles.secondaryButtonText}>📚  Turn Into Learning Topic</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {(homeError || (inputMode === 'voice' && error)) ? (
            <View style={[cardStyle(StickiesColors.pink, StickiesColors.pinkDark), styles.errorCard]}>
              <Text style={styles.errorText}>{homeError || error}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: StickiesColors.desk },
  scrollSection: { flex: 1 },
  content: { padding: 18, paddingBottom: 40 },
  pageTitle: { ...TypographyRounded.sectionHeader, color: StickiesColors.ink, marginBottom: 6 },
  pageSubtitle: { ...TypographyRounded.cardMeta, color: StickiesColors.inkMuted, marginBottom: 20 },
  segmentedControl: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: StickiesColors.grayDark,
    borderRadius: CARD_RADIUS,
    borderBottomWidth: CARD_BORDER,
    borderBottomColor: '#cbd5e1',
    padding: 4,
  },
  segment: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  segmentLeft: { marginRight: 2 },
  segmentRight: { marginLeft: 2 },
  segmentActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  segmentText: { ...TypographyRounded.cardTitle, color: StickiesColors.inkMuted },
  segmentTextActive: { color: StickiesColors.ink },
  recordSection: { alignItems: 'center' },
  typeCard: { minHeight: 140 },
  typePlaceholder: { ...TypographyRounded.cardMeta, color: StickiesColors.inkLight, marginBottom: 8 },
  typeInput: { ...TypographyRounded.cardMeta, fontSize: 16, color: StickiesColors.ink, padding: 0, minHeight: 80, lineHeight: 22 },
  actionsSection: {
    marginBottom: 20,
  },
  actionsTitle: { ...TypographyRounded.cardMeta, color: StickiesColors.inkMuted, marginBottom: 14 },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderBottomWidth: 2,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  primaryButtonTasks: { backgroundColor: StickiesColors.blue, borderBottomColor: StickiesColors.blueBorder },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { ...TypographyRounded.cardTitle, color: '#1e3a8a', fontSize: 17 },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: StickiesColors.grayDark,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
  },
  secondaryButtonText: { ...TypographyRounded.cardTitle, color: StickiesColors.ink, fontSize: 17 },
  errorCard: { marginBottom: 20 },
  errorText: { ...TypographyRounded.cardMeta, color: StickiesColors.error, lineHeight: 20 },
  section: {},
  sectionLabel: {
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkMuted,
    marginBottom: 10,
  },
  transcriptCard: { marginBottom: 0 },
  transcript: { ...TypographyRounded.cardMeta, fontSize: 16, color: StickiesColors.ink, lineHeight: 22 },
});
