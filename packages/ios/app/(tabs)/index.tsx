/**
 * Main feed: vertical paging card view with mesh gradient cards,
 * liquid scale transition, and FAB for adding notes.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { FeedCard, feedCardHeight } from '../../src/components/FeedCard';
import { getTasks, getLearningStickies } from '../../src/api/client';
import { StickiesColors } from '../../src/theme/stickies';
import type { Task } from '../../src/types';
import type { LearningSticky } from '../../src/types';

export type FeedItem =
  | { type: 'task'; id: string; createdAt: string; data: Task }
  | { type: 'learning'; id: string; createdAt: string; data: LearningSticky };

function feedItemId(item: FeedItem): string {
  return item.type === 'task' ? item.data.id : item.data.id;
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { auth } = useAuthContext();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const scrollOffset = useSharedValue(0);
  const cardHeight = feedCardHeight();

  const loadFeed = useCallback(async () => {
    if (!auth) return;
    try {
      const [tasksRes, learnRes] = await Promise.all([
        getTasks(auth),
        getLearningStickies(auth, { limit: 50 }),
      ]);
      const taskItems: FeedItem[] = (tasksRes.tasks || []).map((t) => ({
        type: 'task',
        id: t.id,
        createdAt: t.createdAt,
        data: t as Task,
      }));
      const learnItems: FeedItem[] = (learnRes.learningStickies || []).map((s) => ({
        type: 'learning',
        id: s.id,
        createdAt: s.createdAt,
        data: s,
      }));
      const combined = [...taskItems, ...learnItems].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setItems(combined);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth]);

  useEffect(() => {
    if (auth) loadFeed();
    else setLoading(false);
  }, [auth, loadFeed]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFeed();
  }, [loadFeed]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffset.value = e.nativeEvent.contentOffset.y;
    },
    [scrollOffset]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => (
      <FeedCard
        index={index}
        scrollOffset={scrollOffset}
        cardHeight={cardHeight}
      >
        {item.type === 'task' ? (
          <>
            <Text style={styles.cardLabel}>Task</Text>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.data.title}
            </Text>
            {item.data.description ? (
              <Text style={styles.cardBody} numberOfLines={3}>
                {item.data.description}
              </Text>
            ) : null}
            {item.data.completed && (
              <Text style={styles.cardMeta}>Completed</Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.cardLabel}>
              {item.data.domain || 'Learning'}
            </Text>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.data.concept}
            </Text>
            <Text style={styles.cardBody} numberOfLines={4}>
              {item.data.definition}
            </Text>
          </>
        )}
      </FeedCard>
    ),
    [scrollOffset, cardHeight]
  );

  const listData: (FeedItem | { type: 'empty'; id: string })[] =
    items.length > 0
      ? items
      : [{ type: 'empty', id: 'empty' }];

  const renderItemOrEmpty = useCallback(
    (info: { item: FeedItem | { type: 'empty'; id: string }; index: number }) => {
      const it = info.item;
      if ('type' in it && it.type === 'empty') {
        return (
          <FeedCard
            index={0}
            scrollOffset={scrollOffset}
            cardHeight={cardHeight}
          >
            <Text style={styles.emptyTitle}>No notes yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button below to add tasks or create a learning area.
            </Text>
          </FeedCard>
        );
      }
      return renderItem({ item: it as FeedItem, index: info.index });
    },
    [scrollOffset, cardHeight, renderItem]
  );

  const keyExtractorFeed = useCallback(
    (item: FeedItem | { type: 'empty'; id: string }) =>
      'type' in item && item.type === 'empty' ? 'empty' : feedItemId(item as FeedItem),
    []
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: cardHeight,
      offset: cardHeight * index,
      index,
    }),
    [cardHeight]
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={listData}
        renderItem={renderItemOrEmpty}
        keyExtractor={keyExtractorFeed}
        onScroll={onScroll}
        scrollEventThrottle={16}
        pagingEnabled
        snapToInterval={cardHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        getItemLayout={getItemLayout}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={StickiesColors.inkMuted}
          />
        }
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => router.push('/add-note')}
        activeOpacity={0.85}
      >
        <View style={styles.fabInner}>
          {Platform.OS === 'ios' ? (
            <SymbolView
              name="plus"
              size={28}
              tintColor={StickiesColors.ink}
              weight="medium"
              fallback={<Text style={styles.fabPlus}>+</Text>}
            />
          ) : (
            <Text style={styles.fabPlus}>+</Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: StickiesColors.desk,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: StickiesColors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: StickiesColors.ink,
    lineHeight: 28,
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 16,
    color: StickiesColors.inkMuted,
    lineHeight: 24,
  },
  cardMeta: {
    fontSize: 13,
    color: StickiesColors.inkLight,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: StickiesColors.ink,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: StickiesColors.inkMuted,
    lineHeight: 24,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  fabInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabPlus: {
    fontSize: 32,
    fontWeight: '300',
    color: StickiesColors.ink,
  },
});
