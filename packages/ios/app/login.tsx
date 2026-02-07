import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_USERS } from '../src/types';
import { login } from '../src/api/client';
import { StickyCard } from '../src/components/StickyCard';
import { StickiesColors } from '../src/theme/stickies';

const USER_KEY = 'stickies_user_id';
const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const STICKY_COLORS = [StickiesColors.yellow, StickiesColors.pink, StickiesColors.blue];

export default function Login() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const { success } = await login(BASE, selected);
      if (!success) {
        await AsyncStorage.setItem(USER_KEY, selected);
        router.replace('/(tabs)');
        return;
      }
      await AsyncStorage.setItem(USER_KEY, selected);
      router.replace('/(tabs)');
    } catch {
      await AsyncStorage.setItem(USER_KEY, selected);
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topSpacer} />
      <View style={styles.hero}>
        <Text style={styles.emoji}>🎤</Text>
        <Text style={styles.title}>Stickies AI</Text>
      </View>
      <ScrollView
        style={styles.bottomSection}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>Select an account</Text>

        {MOCK_USERS.map((u, i) => (
          <TouchableOpacity
            key={u.id}
            onPress={() => setSelected(u.id)}
            style={styles.userBtnWrap}
            activeOpacity={0.85}
          >
            <StickyCard
              backgroundColor={STICKY_COLORS[i % STICKY_COLORS.length]}
              softShadow
              style={[styles.userSticky, selected === u.id && styles.userStickySelected]}
            >
              <Text style={styles.userName}>{u.displayName}</Text>
              <Text style={styles.userId}>@{u.username}</Text>
            </StickyCard>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.continueWrap, (!selected || loading) && styles.continueDisabled]}
          onPress={handleLogin}
          disabled={!selected || loading}
        >
          <StickyCard backgroundColor={StickiesColors.green} softShadow style={styles.continueSticky}>
            {loading ? (
              <ActivityIndicator color={StickiesColors.ink} />
            ) : (
              <Text style={styles.continueText}>Continue</Text>
            )}
          </StickyCard>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: StickiesColors.desk,
  },
  topSpacer: {
    flex: 1,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: StickiesColors.ink,
  },
  bottomSection: {
    flex: 1,
  },
  formContent: {
    padding: 24,
    paddingBottom: 48,
  },
  subtitle: {
    fontSize: 16,
    color: StickiesColors.inkMuted,
    marginBottom: 20,
  },
  userBtnWrap: {
    marginBottom: 12,
  },
  userSticky: {
    padding: 16,
  },
  userStickySelected: {
    borderWidth: 2,
    borderColor: StickiesColors.ink,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: StickiesColors.ink,
  },
  userId: {
    fontSize: 14,
    color: StickiesColors.inkMuted,
    marginTop: 2,
  },
  continueWrap: {
    marginTop: 28,
  },
  continueDisabled: {
    opacity: 0.6,
  },
  continueSticky: {
    padding: 16,
    alignItems: 'center',
  },
  continueText: {
    color: StickiesColors.ink,
    fontSize: 17,
    fontWeight: '600',
  },
});
