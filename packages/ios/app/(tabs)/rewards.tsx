import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getRewardsDailyStats,
  getRewardsWeeklyReport,
  getRewardsHighlights,
  getRewardsUnlocks,
  getRewardsProductivity,
} from '../../src/api/client';
import { subscribeRewardsRefresh } from '../../src/utils/rewards-refresh';
import { StickiesColors, TypographyRounded, Spacing } from '../../src/theme/stickies';

const CARD_RADIUS = 16;
const CARD_BORDER = 3;
const cardStyle = (bg: string, borderColor: string) => ({
  backgroundColor: bg,
  borderRadius: CARD_RADIUS,
  borderBottomWidth: CARD_BORDER,
  borderBottomColor: borderColor,
  padding: 16,
  minHeight: 48,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
});

const USER_KEY = 'stickies_user_id';

type DailyStat = {
  date: string; // YYYY-MM-DD
  effortScore: number;
  tasksCompleted: number;
  reviewsCompleted: number;
};

type WeeklyReport = {
  startDate: string;
  endDate: string;
  days: number;
  activeDays: number;
  totalTasks: number;
  totalReviews: number;
  averageEffort: number;
  bestDay: { date: string; effortScore: number } | null;
};

function effortLevel(score: number): number {
  if (score <= 0) return 0;
  if (score < 3) return 1;
  if (score < 7) return 2;
  return 3;
}

function levelColor(level: number): string {
  switch (level) {
    case 0:
      return StickiesColors.grayDark;
    case 1:
      return StickiesColors.greenDark;
    case 2:
      return StickiesColors.green;
    case 3:
    default:
      return StickiesColors.success;
  }
}

export default function RewardsScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [highlights, setHighlights] = useState<Array<Record<string, unknown>>>([]);
  const [unlocks, setUnlocks] = useState<
    Array<{ id: string; type: string; isEnabled: boolean; earnedAt: string; metadata: unknown }>
  >([]);
  const [insight, setInsight] = useState<string | null>(null);

  const load = useCallback(async () => {
    const uid = await AsyncStorage.getItem(USER_KEY);
    setUserId(uid);
    if (!uid) return;

    setError(null);
    setLoading(true);
    try {
      const [dailyRes, weeklyRes, highlightsRes, unlocksRes, productivityRes] = await Promise.all([
        getRewardsDailyStats(uid, 30),
        getRewardsWeeklyReport(uid),
        getRewardsHighlights(uid),
        getRewardsUnlocks(uid),
        getRewardsProductivity(uid),
      ]);
      setDaily(dailyRes.stats);
      setWeekly(weeklyRes);
      setHighlights(highlightsRes.highlights);
      setUnlocks(unlocksRes.unlocks);
      setInsight(productivityRes.insight ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load rewards');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    const unsubscribe = subscribeRewardsRefresh(() => {
      load();
    });
    return unsubscribe;
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const heatmapCells = useMemo(() => {
    return daily.map((d) => ({
      ...d,
      level: effortLevel(d.effortScore),
    }));
  }, [daily]);

  if (!userId) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={[styles.cardWrap, cardStyle(StickiesColors.taskCardToday, StickiesColors.taskCardTodayBorder)]}>
            <Text style={styles.title}>Rewards</Text>
            <Text style={styles.hint}>Log in to see your progress.</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={StickiesColors.inkMuted} />
      }
    >
      {error ? (
        <View style={[styles.cardWrap, cardStyle(StickiesColors.taskCardPast, StickiesColors.taskCardPastBorder)]}>
          <Text style={styles.cardTitle}>Could not load</Text>
          <Text style={styles.cardBody}>{error}</Text>
        </View>
      ) : null}

      {insight != null && insight !== '' ? (
        <View style={[styles.cardWrap, cardStyle(StickiesColors.taskCardToday, StickiesColors.taskCardTodayBorder)]}>
          <Text style={styles.cardTitle}>Your insight</Text>
          <Text style={styles.cardBody}>{insight}</Text>
        </View>
      ) : null}

      <View style={[styles.cardWrap, cardStyle(StickiesColors.gray, StickiesColors.grayDark)]}>
        <Text style={styles.cardTitle}>Effort heatmap (last 30 days)</Text>
        {loading && daily.length === 0 ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={StickiesColors.inkMuted} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : daily.length === 0 ? (
          <Text style={styles.cardBody}>
            No activity yet. Complete tasks or review learning stickies and you’ll see it here.
          </Text>
        ) : (
          <View style={styles.heatmapGrid}>
            {heatmapCells.map((cell) => (
              <View
                key={cell.date}
                style={[
                  styles.heatmapCell,
                  { backgroundColor: levelColor(cell.level) },
                ]}
              />
            ))}
          </View>
        )}
        <View style={styles.legendRow}>
          <Text style={styles.legendText}>Less</Text>
          <View style={styles.legendSwatches}>
            {[0, 1, 2, 3].map((lvl) => (
              <View key={lvl} style={[styles.legendSwatch, { backgroundColor: levelColor(lvl) }]} />
            ))}
          </View>
          <Text style={styles.legendText}>More</Text>
        </View>
      </View>

      <View style={[styles.cardWrap, cardStyle(StickiesColors.blue, StickiesColors.blueBorder)]}>
        <Text style={styles.cardTitle}>Weekly recap</Text>
        {!weekly ? (
          <Text style={styles.cardBody}>No data yet for this week.</Text>
        ) : (
          <View style={styles.weeklyGrid}>
            <View style={styles.weeklyItem}>
              <Text style={styles.weeklyLabel}>Active days</Text>
              <Text style={styles.weeklyValue}>
                {weekly.activeDays} / {weekly.days}
              </Text>
              <Text style={styles.weeklyMeta}>
                {weekly.startDate} → {weekly.endDate}
              </Text>
            </View>
            <View style={styles.weeklyItem}>
              <Text style={styles.weeklyLabel}>Tasks</Text>
              <Text style={styles.weeklyValue}>{weekly.totalTasks}</Text>
              <Text style={styles.weeklyMeta}>Completed</Text>
            </View>
            <View style={styles.weeklyItem}>
              <Text style={styles.weeklyLabel}>Reviews</Text>
              <Text style={styles.weeklyValue}>{weekly.totalReviews}</Text>
              <Text style={styles.weeklyMeta}>Learning stickies</Text>
            </View>
          </View>
        )}
      </View>

      <View style={[styles.cardWrap, cardStyle(StickiesColors.taskCardPast, StickiesColors.taskCardPastBorder)]}>
        <Text style={styles.cardTitle}>Highlights</Text>
        {highlights.length === 0 ? (
          <Text style={styles.cardBody}>Highlights will show up once you have more activity.</Text>
        ) : (
          <View style={styles.highlightList}>
            {highlights.slice(0, 3).map((h, idx) => (
              <View key={String(h.id ?? idx)} style={styles.highlightItem}>
                <Text style={styles.highlightTitle}>{String(h.title ?? 'Highlight')}</Text>
                {h.description ? (
                  <Text style={styles.highlightBody}>{String(h.description)}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.cardWrap, cardStyle(StickiesColors.taskCardUpcoming, StickiesColors.taskCardUpcomingBorder)]}>
        <Text style={styles.cardTitle}>Unlocks</Text>
        {unlocks.length === 0 ? (
          <Text style={styles.cardBody}>
            No unlocks yet. Hit a 7‑day streak to unlock a theme.
          </Text>
        ) : (
          <View style={styles.unlockList}>
            {unlocks.map((u) => (
              <View key={u.id} style={styles.unlockItem}>
                <Text style={styles.unlockType}>{u.type}</Text>
                <Text style={styles.unlockMeta}>
                  {u.isEnabled ? 'Enabled' : 'Disabled'} · {new Date(u.earnedAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: StickiesColors.desk,
  },
  content: {
    padding: 18,
    gap: 14,
    paddingBottom: 28,
  },
  cardWrap: {
    marginBottom: 0,
  },
  title: {
    ...TypographyRounded.sectionHeader,
    color: StickiesColors.ink,
  },
  hint: {
    marginTop: 6,
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkMuted,
  },
  cardTitle: {
    ...TypographyRounded.cardTitle,
    color: StickiesColors.ink,
    marginBottom: 10,
  },
  cardBody: {
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkMuted,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  loadingText: {
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkMuted,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 6,
  },
  heatmapCell: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.08)',
  },
  legendRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendText: {
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkLight,
  },
  legendSwatches: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  legendSwatch: {
    width: 16,
    height: 10,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.08)',
  },
  weeklyGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  weeklyItem: {
    flex: 1,
    backgroundColor: 'rgba(28,25,23,0.06)',
    borderRadius: 12,
    padding: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(28,25,23,0.08)',
  },
  weeklyLabel: {
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weeklyValue: {
    marginTop: 6,
    ...TypographyRounded.cardTitle,
    color: StickiesColors.ink,
  },
  weeklyMeta: {
    marginTop: 2,
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkMuted,
  },
  highlightList: {
    gap: Spacing.md,
  },
  highlightItem: {
    backgroundColor: 'rgba(28,25,23,0.06)',
    borderRadius: 12,
    padding: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(28,25,23,0.08)',
  },
  highlightTitle: {
    ...TypographyRounded.cardTitle,
    color: StickiesColors.ink,
  },
  highlightBody: {
    marginTop: 4,
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkMuted,
  },
  unlockList: {
    gap: 10,
  },
  unlockItem: {
    backgroundColor: 'rgba(28,25,23,0.06)',
    borderRadius: 12,
    padding: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(28,25,23,0.08)',
  },
  unlockType: {
    ...TypographyRounded.cardTitle,
    color: StickiesColors.ink,
  },
  unlockMeta: {
    marginTop: 4,
    ...TypographyRounded.cardMeta,
    color: StickiesColors.inkMuted,
  },
});

