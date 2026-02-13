import { useCallback, useEffect, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthContext } from '../../src/contexts/AuthContext';
import { StickyCard } from '../../src/components/StickyCard';
import {
  getLearningStickiesDomains,
  getLearningStickies,
  generateLearningStickies,
  deleteLearningSticky,
  deleteLearningStickiesByDomain,
} from '../../src/api/client';
import { StickiesColors, colorForArea } from '../../src/theme/stickies';
import type { LearningSticky } from '../../src/types';

export default function LearningStickiesScreen() {
  const { auth } = useAuthContext();
  const [areas, setAreas] = useState<Array<{ domain: string; count: number }>>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [areaStickies, setAreaStickies] = useState<LearningSticky[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refineInput, setRefineInput] = useState('');
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [areasEditMode, setAreasEditMode] = useState(false);
  const [stickiesEditMode, setStickiesEditMode] = useState(false);

  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    navigation.setOptions({
      headerShown: !selectedDomain,
    });
  }, [selectedDomain, navigation]);

  const loadDomains = useCallback(async () => {
    if (!auth) return;
    setFetchError(null);
    setLoading(true);
    try {
      const { domains } = await getLearningStickiesDomains(auth);
      setAreas(domains);
    } catch (e) {
      setAreas([]);
      setFetchError(e instanceof Error ? e.message : 'Could not load areas');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const loadAreaStickies = useCallback(async (domain: string) => {
    if (!auth) return;
    setLoading(true);
    setFetchError(null);
    try {
      const { learningStickies } = await getLearningStickies(auth, { domain });
      setAreaStickies(learningStickies);
    } catch (e) {
      setAreaStickies([]);
      setFetchError(e instanceof Error ? e.message : 'Could not load stickies');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);

  useFocusEffect(
    useCallback(() => {
      if (auth) loadDomains();
    }, [auth, loadDomains])
  );

  useEffect(() => {
    if (selectedDomain && auth) {
      loadAreaStickies(selectedDomain);
    }
  }, [selectedDomain, auth, loadAreaStickies]);

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

  const handleRefine = useCallback(async () => {
    if (!selectedDomain || !auth) return;
    setRefining(true);
    setRefineError(null);
    try {
      await generateLearningStickies(auth, selectedDomain, refineInput.trim());
      setRefineInput('');
      await loadAreaStickies(selectedDomain);
      await loadDomains();
    } catch (e) {
      setRefineError(e instanceof Error ? e.message : 'Failed to add more');
    } finally {
      setRefining(false);
    }
  }, [selectedDomain, userId, refineInput, loadAreaStickies, loadDomains]);

  const handleRemoveSticky = useCallback(
    async (id: string) => {
      if (!auth) return;
      try {
        await deleteLearningSticky(auth, id);
        if (selectedDomain) await loadAreaStickies(selectedDomain);
        await loadDomains();
      } catch (_) {}
    },
    [auth, selectedDomain, loadAreaStickies, loadDomains]
  );

  const handleRemoveAreaFromList = useCallback(
    (domain: string) => {
      if (!auth) return;
      Alert.alert(
        'Remove area',
        `Remove "${domain}" and all its stickies?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteLearningStickiesByDomain(auth, domain);
                if (selectedDomain === domain) {
                  setSelectedDomain(null);
                  setAreaStickies([]);
                }
                await loadDomains();
              } catch (_) {}
            },
          },
        ]
      );
    },
    [auth, selectedDomain, loadDomains]
  );

  if (!auth) {
    return (
      <View style={styles.centered}>
        <StickyCard backgroundColor={StickiesColors.yellow} softShadow style={styles.emptySticky}>
          <Text style={styles.empty}>Log in to see learning stickies.</Text>
        </StickyCard>
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
                setSelectedDomain(null);
                setFetchError(null);
                setStickiesEditMode(false);
              }}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>← Back to areas</Text>
            </TouchableOpacity>
            <Text style={styles.detailTitle} numberOfLines={1}>{selectedDomain}</Text>
            {areaStickies.length > 0 ? (
              <TouchableOpacity onPress={() => setStickiesEditMode((v) => !v)} style={styles.editButton}>
                <Text style={styles.editButtonText}>{stickiesEditMode ? 'Done' : 'Edit'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.generateSection}>
            <StickyCard backgroundColor={StickiesColors.orange} softShadow style={styles.generateCard}>
              <Text style={styles.generateLabel}>Refine or add more (prompt the LLM)</Text>
              <TextInput
                style={styles.input}
                value={refineInput}
                onChangeText={(t) => {
                  setRefineInput(t);
                  setRefineError(null);
                }}
                placeholder="e.g. add speed limits for school zones"
                placeholderTextColor={StickiesColors.inkLight}
                editable={!refining}
              />
              <TouchableOpacity
                style={[styles.generateButton, refining && styles.generateButtonDisabled]}
                onPress={handleRefine}
                disabled={refining}
              >
                {refining ? (
                  <ActivityIndicator size="small" color={StickiesColors.ink} />
                ) : (
                  <Text style={styles.generateButtonText}>Add more</Text>
                )}
              </TouchableOpacity>
              {refineError ? <Text style={styles.errorText}>{refineError}</Text> : null}
            </StickyCard>
          </View>

          {fetchError && areaStickies.length === 0 ? (
            <View style={styles.centeredList}>
              <StickyCard backgroundColor={StickiesColors.pink} softShadow style={styles.emptySticky}>
                <Text style={styles.errorTitle}>Could not load stickies</Text>
                <Text style={styles.empty}>{fetchError}</Text>
                <Text style={styles.hint}>Pull down to retry.</Text>
              </StickyCard>
            </View>
          ) : loading && areaStickies.length === 0 ? (
            <View style={styles.centeredList}>
              <StickyCard backgroundColor={StickiesColors.blue} softShadow style={styles.emptySticky}>
                <ActivityIndicator size="small" color={StickiesColors.inkMuted} />
                <Text style={[styles.empty, { marginTop: 8 }]}>Loading…</Text>
              </StickyCard>
            </View>
          ) : areaStickies.length === 0 ? (
            <View style={styles.centeredList}>
              <StickyCard backgroundColor={StickiesColors.yellow} softShadow style={styles.emptySticky}>
                <Text style={styles.empty}>No stickies in this area. Use “Add more” above to prompt the LLM.</Text>
              </StickyCard>
            </View>
          ) : (
            <FlatList
              data={areaStickies}
              keyExtractor={(s) => s.id}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={StickiesColors.inkMuted} />
              }
                renderItem={({ item }) => (
                  <View style={styles.stickyRow}>
                    <View style={styles.stickyWrapper}>
                      <StickyCard backgroundColor={selectedDomain ? colorForArea(selectedDomain) : StickiesColors.blue} softShadow style={styles.stickyCard}>
                        <Text style={styles.concept}>{item.concept}</Text>
                        <Text style={styles.definition}>{item.definition}</Text>
                      </StickyCard>
                    </View>
                    {stickiesEditMode && (
                      <TouchableOpacity
                        onPress={() => handleRemoveSticky(item.id)}
                        style={styles.removeStickyButton}
                      >
                        <Text style={styles.removeStickyText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
            />
          )}
        </>
      ) : (
        /* Areas list */
        <>
          {fetchError && areas.length === 0 ? (
            <View style={styles.centeredList}>
              <StickyCard backgroundColor={StickiesColors.pink} softShadow style={styles.emptySticky}>
                <Text style={styles.errorTitle}>Could not load areas</Text>
                <Text style={styles.empty}>{fetchError}</Text>
                <Text style={styles.hint}>Pull down to retry.</Text>
              </StickyCard>
            </View>
          ) : loading && areas.length === 0 ? (
            <View style={styles.centeredList}>
              <StickyCard backgroundColor={StickiesColors.blue} softShadow style={styles.emptySticky}>
                <ActivityIndicator size="small" color={StickiesColors.inkMuted} />
                <Text style={[styles.empty, { marginTop: 8 }]}>Loading…</Text>
              </StickyCard>
            </View>
          ) : areas.length === 0 ? (
            <View style={styles.centeredList}>
              <StickyCard backgroundColor={StickiesColors.yellow} softShadow style={styles.emptySticky}>
                <Text style={styles.empty}>No areas yet. Add one from Home (voice or type), then tap “Create learning area”.</Text>
              </StickyCard>
            </View>
          ) : (
            <>
              <View style={styles.areasEditRow}>
                <TouchableOpacity onPress={() => setAreasEditMode((v) => !v)} style={styles.editButton}>
                  <Text style={styles.editButtonText}>{areasEditMode ? 'Done' : 'Edit'}</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={areas}
                keyExtractor={(a) => a.domain}
                contentContainerStyle={styles.list}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={StickiesColors.inkMuted} />
                }
                renderItem={({ item }) => (
                  <View style={styles.areaCardRow}>
                    <TouchableOpacity
                      style={[styles.areaCard, { backgroundColor: colorForArea(item.domain) }, areasEditMode && styles.areaCardEdit]}
                      onPress={() => !areasEditMode && setSelectedDomain(item.domain)}
                      activeOpacity={0.7}
                      disabled={areasEditMode}
                    >
                      <Text style={styles.areaCardTitle}>{item.domain}</Text>
                      <Text style={styles.areaCardCount}>({item.count} stickies)</Text>
                    </TouchableOpacity>
                    {areasEditMode && (
                      <TouchableOpacity
                        onPress={() => handleRemoveAreaFromList(item.domain)}
                        style={styles.areaCardRemove}
                      >
                        <Text style={styles.removeAreaText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              />
            </>
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
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: StickiesColors.inkMuted,
  },
  detailTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: StickiesColors.ink,
  },
  generateSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  generateCard: {
    padding: 14,
  },
  generateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: StickiesColors.ink,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: StickiesColors.grayDark,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: StickiesColors.ink,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  generateButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: StickiesColors.orangeDark,
    borderRadius: 8,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: StickiesColors.ink,
  },
  errorText: {
    fontSize: 14,
    color: StickiesColors.error,
    marginTop: 8,
  },
  removeAreaText: {
    fontSize: 14,
    fontWeight: '600',
    color: StickiesColors.error,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  areasEditRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: StickiesColors.inkMuted,
  },
  areaCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  areaCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: StickiesColors.grayDark,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
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
    fontSize: 17,
    fontWeight: '600',
    color: StickiesColors.ink,
    flex: 1,
  },
  areaCardCount: {
    fontSize: 14,
    color: StickiesColors.inkMuted,
  },
  stickyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  stickyWrapper: {
    flex: 1,
    minWidth: 0,
  },
  stickyCard: {
    padding: 14,
  },
  concept: {
    fontSize: 18,
    fontWeight: '700',
    color: StickiesColors.ink,
    marginBottom: 8,
  },
  definition: {
    fontSize: 15,
    color: StickiesColors.ink,
    lineHeight: 22,
  },
  removeStickyButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  removeStickyText: {
    fontSize: 14,
    color: StickiesColors.inkMuted,
  },
  centeredList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptySticky: {
    maxWidth: 320,
  },
  empty: {
    fontSize: 16,
    color: StickiesColors.inkMuted,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: StickiesColors.ink,
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: StickiesColors.inkLight,
    textAlign: 'center',
    marginTop: 12,
  },
});
