import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_USERS } from '../src/types';
import { login } from '../src/api/client';

const USER_KEY = 'stickies_user_id';
const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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
        // Still allow local-only login for draft (API may be down)
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
      <Text style={styles.title}>🎤 Stickies AI</Text>
      <Text style={styles.subtitle}>Select an account</Text>
      {MOCK_USERS.map((u) => (
        <TouchableOpacity
          key={u.id}
          style={[styles.userBtn, selected === u.id && styles.userBtnSelected]}
          onPress={() => setSelected(u.id)}
        >
          <Text style={styles.userName}>{u.displayName}</Text>
          <Text style={styles.userId}>@{u.username}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[styles.continue, (!selected || loading) && styles.continueDisabled]}
        onPress={handleLogin}
        disabled={!selected || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.continueText}>Continue</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
  },
  userBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  userBtnSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
  },
  userId: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  continue: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  continueDisabled: {
    opacity: 0.5,
  },
  continueText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
