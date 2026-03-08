/**
 * Step-by-step onboarding tour: highlights each main feature with a modal and tab switching.
 * Step 2 (Add a note) positions the card above and to the right of the + button and sets onboardingStepId so Home can highlight the FAB.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboarding } from '../contexts/OnboardingContext';
import { StickyCard } from './StickyCard';
import { StickiesColors, TypographyRounded } from '../theme/stickies';
import { hapticFeedback } from '../utils/haptics';

type TabRoute = '/(tabs)' | '/(tabs)/tasks' | '/(tabs)/learning-stickies' | '/(tabs)/rewards' | '/(tabs)/account';

interface TourStep {
  id: string;
  tab: TabRoute;
  target: 'tab' | 'fab';
  title: string;
  description: string;
}

/** Edit the words in the guide here. Each step shows this title and description in the tour modal. */
const TOUR_STEPS: TourStep[] = [
  { id: 'home', tab: '/(tabs)', target: 'tab', title: 'Home', description: 'This is your Home feed. Your tasks and learning cards appear here in one place.' },
  { id: 'fab', tab: '/(tabs)', target: 'fab', title: 'Add a note', description: 'Tap the + button to add a voice or text note. AI will turn it into tasks or learning stickies.' },
  { id: 'tasks', tab: '/(tabs)/tasks', target: 'tab', title: 'Tasks', description: 'Manage your tasks here. Complete, edit, or delete them and stay on track.' },
  { id: 'learning', tab: '/(tabs)/learning-stickies', target: 'tab', title: 'Learning', description: 'Review learning stickies and flip cards by topic. Great for studying and recall.' },
  { id: 'rewards', tab: '/(tabs)/rewards', target: 'tab', title: 'Rewards', description: 'Track your effort, streaks, and unlocks. Build habits and see your progress.' },
  { id: 'account', tab: '/(tabs)/account', target: 'tab', title: 'Account', description: 'Sign out or manage your account here. You can also show this guide again anytime.' },
];

interface OnboardingTourProps {
  visible: boolean;
  onDismiss: () => void;
}

export function OnboardingTour({ visible, onDismiss }: OnboardingTourProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeTour, skipTour, clearReplayRequest, setOnboardingStepId } = useOnboarding();
  const [stepIndex, setStepIndex] = useState(0);

  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const isFabStep = step?.target === 'fab';

  const goToStepTab = useCallback(() => {
    if (step.tab === '/(tabs)') {
      router.replace('/(tabs)' as any);
    } else {
      router.replace(step.tab as any);
    }
  }, [step?.tab, router]);

  useEffect(() => {
    if (visible && step) {
      goToStepTab();
      setOnboardingStepId(step.id);
    } else if (!visible) {
      setOnboardingStepId(null);
    }
  }, [visible, step?.id, goToStepTab, setOnboardingStepId]);

  const handleNext = useCallback(() => {
    hapticFeedback.press();
    if (isLast) {
      setOnboardingStepId(null);
      clearReplayRequest();
      completeTour().then(() => {
        router.replace('/(tabs)' as any);
        onDismiss();
      });
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [isLast, completeTour, clearReplayRequest, router, onDismiss, setOnboardingStepId]);

  const handleSkip = useCallback(() => {
    hapticFeedback.press();
    setOnboardingStepId(null);
    clearReplayRequest();
    skipTour().then(() => {
      router.replace('/(tabs)' as any);
      onDismiss();
    });
  }, [skipTour, clearReplayRequest, router, onDismiss, setOnboardingStepId]);

  if (!step) return null;

  const fabStepCardBottom = insets.bottom + 24 + 56 + 12 + 100;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <Pressable style={styles.backdrop} onPress={() => {}}>
        <View
          style={[
            styles.content,
            isFabStep && {
              position: 'absolute',
              right: 24,
              bottom: fabStepCardBottom,
              width: 280,
              maxWidth: 320,
            },
          ]}
        >
          <StickyCard backgroundColor={StickiesColors.yellow} softShadow style={styles.card}>
            <Text style={styles.stepCounter}>{stepIndex + 1} of {TOUR_STEPS.length}</Text>
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.description}>{step.description}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
                <StickyCard
                  backgroundColor={isLast ? StickiesColors.green : StickiesColors.ink}
                  softShadow
                  style={styles.nextSticky}
                >
                  <Text style={[styles.nextText, isLast && styles.nextTextOnGreen]}>
                    {isLast ? 'Done' : 'Next'}
                  </Text>
                </StickyCard>
              </TouchableOpacity>
            </View>
          </StickyCard>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  content: {
    alignSelf: 'stretch',
  },
  card: {
    padding: 20,
  },
  stepCounter: {
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    ...TypographyRounded.sectionHeader,
    color: StickiesColors.ink,
    marginBottom: 10,
  },
  description: {
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkMuted,
    lineHeight: 20,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipBtn: { paddingVertical: 10, paddingHorizontal: 4 },
  skipText: { fontSize: 16, fontWeight: '600', color: StickiesColors.inkMuted },
  nextBtn: { minWidth: 120, alignItems: 'flex-end' },
  nextSticky: { paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center' },
  nextText: { fontSize: 17, fontWeight: '700', color: StickiesColors.desk },
  nextTextOnGreen: { color: StickiesColors.ink },
});
