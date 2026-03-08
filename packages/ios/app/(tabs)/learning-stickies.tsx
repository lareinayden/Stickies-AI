import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlipCard } from '../../src/components/FlipCard';
import { Swipeable } from '../../src/components/Swipeable';
import {
  getLearningStickiesDomains,
  getLearningStickies,
  deleteLearningSticky,
  deleteLearningStickiesByDomain,
  getLearningTaskSettings,
  upsertLearningTaskSetting,
  createImmediateLearningTask,
  trackStickyReview,
} from '../../src/api/client';
import { StickiesColors, colorForAreaByIndex, borderColorForAreaByIndex, TypographyRounded, Spacing } from '../../src/theme/stickies';
import { hapticFeedback } from '../../src/utils/haptics';
import { triggerRewardsRefresh } from '../../src/utils/rewards-refresh';
import type { LearningSticky } from '../../src/types';

const PROGRESS_KEY_PREFIX = 'learningStickyProgress:';

type StickyReviewStatus = 'needs_review' | 'learned';
type StickyProgressMap = Record<string, StickyReviewStatus>;

export default function LearningStickiesScreen() {
  const { userId } = useAuth();
  const [areas, setAreas] = useState<Array<{ domain: string; count: number }>>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [areaStickies, setAreaStickies] = useState<LearningSticky[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [statusById, setStatusById] = useState<Record<string, StickyReviewStatus>>({});
  // domain → frequency_days (0 = off, 1 = daily, 3 = every 3 days, 7 = weekly)
  const [reviewFrequency, setReviewFrequency] = useState<Record<string, number>>({});

  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    navigation.setOptions({
      headerShown: !selectedDomain,
    });
  }, [selectedDomain, navigation]);

  const loadDomains = useCallback(async () => {
    if (!userId) return;

    // Load per-sticky progress state once we know the user.
    try {
      const raw = await AsyncStorage.getItem(`${PROGRESS_KEY_PREFIX}${userId}`);
      const parsed = raw ? (JSON.parse(raw) as StickyProgressMap) : {};
      setStatusById(parsed ?? {});
    } catch (_) {
      setStatusById({});
    }

    setFetchError(null);
    setLoading(true);
    try {
      const [{ domains }, settingsResult] = await Promise.all([
        getLearningStickiesDomains(userId),
        getLearningTaskSettings(userId).catch(() => ({ settings: [] })),
      ]);
      setAreas(domains);
      const freq: Record<string, number> = {};
      for (const s of settingsResult.settings) freq[s.domain] = s.frequencyDays;
      setReviewFrequency(freq);
    } catch (e) {
      setAreas([]);
      setFetchError(e instanceof Error ? e.message : 'Could not load areas');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const setStickyStatus = useCallback(
    async (sticky: LearningSticky, status: StickyReviewStatus) => {
      if (!userId) return;
      hapticFeedback.tap();

      setStatusById((prev) => {
        const next: StickyProgressMap = { ...prev, [sticky.id]: status };
        // Persist best-effort (don't block UI)
        void AsyncStorage.setItem(
          `${PROGRESS_KEY_PREFIX}${userId}`,
          JSON.stringify(next)
        ).catch(() => undefined);
        return next;
      });

      // Also emit server-side event so rewards pipeline can count reviews.
      void trackStickyReview(userId, {
        stickyId: sticky.id,
        domain: selectedDomain ?? sticky.domain ?? null,
        status,
      }).catch(() => undefined);
      triggerRewardsRefresh();
    },
    [userId, selectedDomain]
  );

  const loadAreaStickies = useCallback(async (domain: string) => {
    if (!userId) return;
    setLoading(true);
    setFetchError(null);
    try {
      const { learningStickies } = await getLearningStickies(userId, { domain });
      setAreaStickies(learningStickies);
    } catch (e) {
      setAreaStickies([]);
      setFetchError(e instanceof Error ? e.message : 'Could not load stickies');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  useFocusEffect(
    useCallback(() => {
      if (userId) loadDomains();
    }, [userId, loadDomains])
  );

  useEffect(() => {
    if (selectedDomain && userId) {
      loadAreaStickies(selectedDomain);
    }
  }, [selectedDomain, userId, loadAreaStickies]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (selectedDomain) {
      await loadAreaStickies(selectedDomain);
      await loadDomains();
    } else {
      await loadDomains();
    }
    setRefreshing(false);
  }, [selectedDomain, loadDomains, loadAreaStickies]);

  const handleRemoveSticky = useCallback(
    async (sticky: LearningSticky) => {
      if (!userId) return;
      hapticFeedback.delete();
      Alert.alert(
        'Delete sticky',
        `Delete "${sticky.concept}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteLearningSticky(userId, sticky.id);
                if (selectedDomain) await loadAreaStickies(selectedDomain);
                await loadDomains();
              } catch (_) {
                Alert.alert('Error', 'Could not delete sticky.');
              }
            },
          },
        ]
      );
    },
    [userId, selectedDomain, loadAreaStickies, loadDomains]
  );

  const handleRemoveAreaFromList = useCallback(
    (domain: string) => {
      if (!userId) return;
      hapticFeedback.delete();
      Alert.alert(
        'Delete learning area',
        `Delete "${domain}" and all its stickies?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteLearningStickiesByDomain(userId, domain);
                if (selectedDomain === domain) {
                  setSelectedDomain(null);
                  setAreaStickies([]);
                }
                await loadDomains();
              } catch (_) {
                Alert.alert('Error', 'Could not delete learning area.');
              }
            },
          },
        ]
      );
    },
    [userId, selectedDomain, loadDomains]
  );

  const handleFrequencyChange = useCallback(
    async (domain: string, days: number) => {
      if (!userId) return;
      hapticFeedback.tap();
      setReviewFrequency((prev) => ({ ...prev, [domain]: days }));
      try {
        await upsertLearningTaskSetting(userId, domain, days);
        // If a frequency was just enabled, immediately create a task and
        // navigate to Tasks tab so the task is guaranteed to be in the DB
        // before the Tasks tab loads its list.
        if (days > 0) {
          try {
            await createImmediateLearningTask(userId, domain);
            // Navigate AFTER creation so useFocusEffect on Tasks tab fires
            // after the task is already in the database.
            router.navigate('/(tabs)/tasks');
          } catch (err) {
            Alert.alert(
              'Task not created',
              err instanceof Error ? err.message : 'Could not create review task.'
            );
          }
        }
      } catch (_) {
        // Revert on failure
        setReviewFrequency((prev) => ({ ...prev, [domain]: prev[domain] ?? 0 }));
        Alert.alert('Error', 'Could not save review schedule.');
      }
    },
    [userId]
  );

  const sortedAreaStickies = useMemo(() => {
    const arr = [...areaStickies];
    arr.sort((a, b) => {
      const sa = statusById[a.id] ?? 'needs_review';
      const sb = statusById[b.id] ?? 'needs_review';
      if (sa !== sb) return sa === 'needs_review' ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return arr;
  }, [areaStickies, statusById]);

  if (!userId) {
    return (
      <View style={styles.centered}>
        <View style={[styles.emptyCard, { backgroundColor: StickiesColors.taskCardToday, borderBottomColor: StickiesColors.taskCardTodayBorder }]}>
          <Text style={styles.empty}>Log in to see learning stickies.</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {selectedDomain ? (
        /* Detail: stickies for one area (header hidden, add top safe area) */
        <>
          <View style={[styles.detailHeader, { paddingTop: 12 + insets.top }]}>
            <TouchableOpacity
              onPress={() => {
                hapticFeedback.tap();
                setSelectedDomain(null);
                setFetchError(null);
              }}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← Back to areas</Text>
            </TouchableOpacity>
            <Text style={styles.detailTitle} numberOfLines={1}>{selectedDomain}</Text>
          </View>

          {fetchError && areaStickies.length === 0 ? (
            <View style={styles.centeredList}>
              <View style={[styles.emptyCard, { backgroundColor: StickiesColors.taskCardPast, borderBottomColor: StickiesColors.taskCardPastBorder }]}>
                <Text style={styles.errorTitle}>Could not load stickies</Text>
                <Text style={styles.empty}>{fetchError}</Text>
                <Text style={styles.hint}>Pull down to retry.</Text>
              </View>
            </View>
          ) : loading && areaStickies.length === 0 ? (
            <View style={styles.centeredList}>
              <View style={[styles.emptyCard, { backgroundColor: StickiesColors.taskCardUpcoming, borderBottomColor: StickiesColors.taskCardUpcomingBorder }]}>
                <ActivityIndicator size="small" color={StickiesColors.inkMuted} />
                <Text style={[styles.empty, { marginTop: 8 }]}>Loading…</Text>
              </View>
            </View>
          ) : areaStickies.length === 0 ? (
            <View style={styles.centeredList}>
              <View style={[styles.emptyCard, { backgroundColor: StickiesColors.taskCardToday, borderBottomColor: StickiesColors.taskCardTodayBorder }]}>
                <Text style={styles.empty}>No stickies in this area. Use “Add more” above to prompt the LLM.</Text>
              </View>
            </View>
          ) : (
            <FlatList
              data={sortedAreaStickies}
              keyExtractor={(s) => s.id}
              contentContainerStyle={styles.list}
              numColumns={1}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={StickiesColors.inkMuted}
                />
              }
              renderItem={({ item }) => {
                const status = statusById[item.id] ?? 'needs_review';
                const areaIndex = Math.max(0, areas.findIndex((a) => a.domain === selectedDomain));
                const bg = selectedDomain ? colorForAreaByIndex(areaIndex) : StickiesColors.taskCardUpcoming;
                const borderBottom = selectedDomain ? borderColorForAreaByIndex(areaIndex) : StickiesColors.taskCardUpcomingBorder;
                const isLearned = status === 'learned';
                return (
                  <Swipeable
                    rightActions={[
                      {
                        label: 'Delete',
                        icon: 'trash',
                        color: StickiesColors.error,
                        type: 'destructive',
                        onPress: () => handleRemoveSticky(item),
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.stickyGridItem,
                        isLearned && styles.learnedDim,
                      ]}
                    >
                      {isLearned ? (
                        <View style={[styles.masteredSheen, styles.flipCardSheen]} pointerEvents="none" />
                      ) : null}
                      <FlipCard
                        borderRadius={16}
                        style={styles.flipPressable}
                        cardStyle={[
                          styles.flipCard,
                          {
                            backgroundColor: bg,
                            borderBottomWidth: 3,
                            borderBottomColor: borderBottom,
                          },
                        ]}
                        front={
                          <View style={styles.flipFaceContent}>
                            <Text style={styles.concept} numberOfLines={3}>
                              {item.concept}
                            </Text>
                            <Text style={styles.flipHint}>Tap to flip</Text>
                          </View>
                        }
                        back={
                          <View style={styles.flipFaceContent}>
                            <Text style={styles.definition} numberOfLines={5}>
                              {item.definition}
                            </Text>
                            {item.example ? (
                              <Text style={styles.example} numberOfLines={3}>
                                Example: {item.example}
                              </Text>
                            ) : null}
                            <View style={styles.statusRow}>
                              <TouchableOpacity
                                onPress={() =>
                                  setStickyStatus(item, 'needs_review')
                                }
                                style={[
                                  styles.statusButton,
                                  status === 'needs_review' && styles.statusButtonActive,
                                ]}
                                activeOpacity={0.85}
                              >
                                <Text
                                  style={[
                                    styles.statusButtonText,
                                    status === 'needs_review' &&
                                      styles.statusButtonTextActive,
                                  ]}
                                >
                                  Needs review
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() =>
                                  setStickyStatus(item, 'learned')
                                }
                                style={[
                                  styles.statusButton,
                                  status === 'learned' && styles.statusButtonActive,
                                ]}
                                activeOpacity={0.85}
                              >
                                <Text
                                  style={[
                                    styles.statusButtonText,
                                    status === 'learned' &&
                                      styles.statusButtonTextActive,
                                  ]}
                                >
                                  Learned
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        }
                      />
                    </View>
                  </Swipeable>
                );
              }}
            />
          )}
        </>
      ) : (
        /* Areas list */
        <>
          {fetchError && areas.length === 0 ? (
            <View style={styles.centeredList}>
              <View style={[styles.emptyCard, { backgroundColor: StickiesColors.taskCardPast, borderBottomColor: StickiesColors.taskCardPastBorder }]}>
                <Text style={styles.errorTitle}>Could not load areas</Text>
                <Text style={styles.empty}>{fetchError}</Text>
                <Text style={styles.hint}>Pull down to retry.</Text>
              </View>
            </View>
          ) : loading && areas.length === 0 ? (
            <View style={styles.centeredList}>
              <View style={[styles.emptyCard, { backgroundColor: StickiesColors.taskCardUpcoming, borderBottomColor: StickiesColors.taskCardUpcomingBorder }]}>
                <ActivityIndicator size="small" color={StickiesColors.inkMuted} />
                <Text style={[styles.empty, { marginTop: 8 }]}>Loading…</Text>
              </View>
            </View>
          ) : areas.length === 0 ? (
            <View style={styles.centeredList}>
              <View style={[styles.emptyCard, { backgroundColor: StickiesColors.taskCardToday, borderBottomColor: StickiesColors.taskCardTodayBorder }]}>
                <Text style={styles.empty}>No areas yet. Add one from Home (voice or type), then tap “Create learning area”.</Text>
              </View>
            </View>
          ) : (
            <FlatList
              data={areas}
              keyExtractor={(a) => a.domain}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={StickiesColors.inkMuted} />
              }
              renderItem={({ item, index }) => (
                <Swipeable
                  rightActions={[
                    {
                      label: 'Delete',
                      icon: 'trash',
                      color: StickiesColors.error,
                      type: 'destructive',
                      onPress: () => handleRemoveAreaFromList(item.domain),
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.areaCard,
                      { backgroundColor: colorForAreaByIndex(index), borderBottomColor: borderColorForAreaByIndex(index) },
                    ]}
                    onPress={() => {
                      hapticFeedback.tap();
                      setSelectedDomain(item.domain);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.areaCardHeader}>
                      <Text style={styles.areaCardTitle}>{item.domain}</Text>
                      <Text style={styles.areaCardCount}>({item.count} stickies)</Text>
                    </View>
                    <View style={styles.frequencyRow}>
                      <Text style={styles.frequencyLabel}>Review:</Text>
                      {([{ label: 'Off', days: 0 }, { label: 'Daily', days: 1 }, { label: '3 days', days: 3 }, { label: 'Weekly', days: 7 }] as const).map(({ label, days }) => {
                        const active = (reviewFrequency[item.domain] ?? 0) === days;
                        return (
                          <TouchableOpacity
                            key={days}
                            style={[styles.freqChip, active && styles.freqChipSelected]}
                            onPress={(e) => { e.stopPropagation(); handleFrequencyChange(item.domain, days); }}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.freqChipText, active && styles.freqChipTextSelected]}>{label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </TouchableOpacity>
                </Swipeable>
              )}
            />
          )}
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: StickiesColors.desk,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyCard: {
    maxWidth: 300,
    borderRadius: 16,
    borderBottomWidth: 3,
    padding: 18,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07,
          shadowRadius: 6,
        }
      : { elevation: 3 }),
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 3,
    borderBottomColor: StickiesColors.grayDark,
    backgroundColor: StickiesColors.deskAlt,
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 8,
  },
  backButtonText: {
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkMuted,
  },
  detailTitle: {
    flex: 1,
    ...TypographyRounded.sectionHeader,
    fontSize: 19,
    lineHeight: 24,
    color: StickiesColors.ink,
  },
  list: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 32,
  },
  stickyGridItem: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 18,
    position: 'relative',
  },
  learnedDim: {
    opacity: 0.5,
  },
  masteredSheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: StickiesColors.masteredSheen,
    borderRadius: 16,
    zIndex: 1,
  },
  flipCardSheen: {
    width: '90%',
    alignSelf: 'center',
    height: 272,
  },
  flipPressable: {
    width: '90%',
    height: 272,
  },
  flipCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  flipFaceContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  flipHint: {
    marginTop: 10,
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkLight,
    textAlign: 'center',
  },
  concept: {
    ...TypographyRounded.cardTitle,
    fontSize: 18,
    color: StickiesColors.ink,
    marginBottom: 10,
    textAlign: 'center',
  },
  definition: {
    ...TypographyRounded.cardTitle,
    fontSize: 15,
    fontWeight: '600',
    color: StickiesColors.ink,
    lineHeight: 22,
  },
  example: {
    marginTop: 10,
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkMuted,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  statusButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderColor: 'rgba(0,0,0,0.12)',
    borderBottomColor: 'rgba(0,0,0,0.2)',
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
  },
  statusButtonActive: {
    borderBottomColor: StickiesColors.taskCardUpcomingBorder,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  statusButtonText: {
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkMuted,
  },
  statusButtonTextActive: {
    color: StickiesColors.ink,
    fontWeight: '700',
  },
  areaCard: {
    flex: 1,
    minWidth: 0,
    borderBottomWidth: 3,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  areaCardEdit: {
    opacity: 0.95,
  },
  areaCardRemove: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  areaCardTitle: {
    ...TypographyRounded.cardTitle,
    color: StickiesColors.ink,
    flex: 1,
  },
  areaCardCount: {
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkMuted,
  },
  areaCardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    width: '100%',
    marginBottom: 10,
  },
  frequencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  frequencyLabel: {
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkMuted,
    marginRight: 4,
  },
  freqChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0,0,0,0.15)',
    borderWidth: 0,
  },
  freqChipSelected: {
    backgroundColor: StickiesColors.taskCardUpcoming,
    borderBottomColor: StickiesColors.taskCardUpcomingBorder,
  },
  freqChipText: {
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkMuted,
  },
  freqChipTextSelected: {
    color: StickiesColors.ink,
    fontWeight: '700',
  },
  centeredList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  empty: {
    ...TypographyRounded.cardMeta,
    fontSize: 15,
    color: StickiesColors.inkMuted,
    textAlign: 'center',
  },
  errorTitle: {
    ...TypographyRounded.cardTitle,
    fontSize: 17,
    color: StickiesColors.ink,
    marginBottom: 6,
    textAlign: 'center',
  },
  hint: {
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkLight,
    textAlign: 'center',
    marginTop: 10,
  },
});


