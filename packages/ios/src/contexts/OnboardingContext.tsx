/**
 * Onboarding state: tour completed flag, first-task encouragement, and current step for FAB highlight.
 * Persisted per user in AsyncStorage.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';

const ONBOARDING_DONE_KEY = 'stickies_onboarding_done_';
const FIRST_TASK_ENCOURAGEMENT_KEY = 'stickies_first_task_encouragement_';

interface OnboardingContextValue {
  shouldShowTour: boolean;
  replayRequested: boolean;
  completeTour: () => Promise<void>;
  skipTour: () => Promise<void>;
  requestReplay: () => void;
  clearReplayRequest: () => void;
  showFirstTaskEncouragement: boolean;
  dismissFirstTaskEncouragement: () => Promise<void>;
  loading: boolean;
  /** Current step id when tour is visible (e.g. 'fab'); used to highlight the + button. */
  onboardingStepId: string | null;
  setOnboardingStepId: (id: string | null) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tourDone, setTourDone] = useState(true);
  const [replayRequested, setReplayRequested] = useState(false);
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [onboardingStepId, setOnboardingStepId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setTourDone(true);
      setShowEncouragement(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [doneVal, encVal] = await Promise.all([
          AsyncStorage.getItem(`${ONBOARDING_DONE_KEY}${userId}`),
          AsyncStorage.getItem(`${FIRST_TASK_ENCOURAGEMENT_KEY}${userId}`),
        ]);
        if (cancelled) return;
        setTourDone(doneVal === 'true');
        setShowEncouragement(encVal === 'show');
      } catch {
        if (!cancelled) setTourDone(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const completeTour = useCallback(async () => {
    if (!userId) return;
    try {
      await AsyncStorage.setItem(`${ONBOARDING_DONE_KEY}${userId}`, 'true');
      await AsyncStorage.setItem(`${FIRST_TASK_ENCOURAGEMENT_KEY}${userId}`, 'show');
      setTourDone(true);
      setShowEncouragement(true);
    } catch (_) {
      setTourDone(true);
      setShowEncouragement(true);
    }
  }, [userId]);

  const skipTour = useCallback(async () => {
    await completeTour();
  }, [completeTour]);

  const requestReplay = useCallback(() => {
    setReplayRequested(true);
  }, []);

  const clearReplayRequest = useCallback(() => {
    setReplayRequested(false);
  }, []);

  const dismissFirstTaskEncouragement = useCallback(async () => {
    if (!userId) return;
    try {
      await AsyncStorage.setItem(`${FIRST_TASK_ENCOURAGEMENT_KEY}${userId}`, 'dismissed');
      setShowEncouragement(false);
    } catch (_) {
      setShowEncouragement(false);
    }
  }, [userId]);

  const shouldShowTour = !loading && !!userId && (!tourDone || replayRequested);

  const value: OnboardingContextValue = {
    shouldShowTour,
    replayRequested,
    completeTour,
    skipTour,
    requestReplay,
    clearReplayRequest,
    showFirstTaskEncouragement: showEncouragement,
    dismissFirstTaskEncouragement,
    loading,
    onboardingStepId,
    setOnboardingStepId,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return ctx;
}
