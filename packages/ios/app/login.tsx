/**
 * Login screen – Supabase email/password or mock users (when Supabase not configured)
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_USERS } from '../src/types';
import { login } from '../src/api/client';
import { StickyCard } from '../src/components/StickyCard';
import { StickiesColors } from '../src/theme/stickies';
import { supabase, isSupabaseConfigured } from '../src/lib/supabase';

const MOCK_USER_KEY = 'stickies_user_id';
const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const STICKY_COLORS = [StickiesColors.yellow, StickiesColors.pink, StickiesColors.blue];

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [selected, setSelected] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSupabaseLogin = async () => {
    if (!isSupabaseConfigured) return;
    if (!email.trim() || !password.trim()) {
      setError('Email and password required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) {
        setError(err.message || 'Sign in failed');
        return;
      }
      if (data.session) {
        router.replace('/(tabs)');
      }
    } catch (e) {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSupabaseSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: displayName.trim() ? { display_name: displayName.trim() } : undefined },
      });
      if (err) {
        setError(err.message || 'Sign up failed');
        return;
      }
      if (data.session) {
        router.replace('/(tabs)');
      } else {
        setError('Check your email to confirm your account.');
      }
    } catch (e) {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMockLogin = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const { success } = await login(BASE, selected);
      await AsyncStorage.setItem(MOCK_USER_KEY, selected);
      router.replace('/(tabs)');
    } catch {
      await AsyncStorage.setItem(MOCK_USER_KEY, selected);
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  if (isSupabaseConfigured) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={60}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <Text style={styles.emoji}>🎤</Text>
            <Text style={styles.title}>Stickies AI</Text>
          </View>
          <Text style={styles.subtitle}>
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={StickiesColors.inkMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={StickiesColors.inkMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'signin' ? 'password' : 'new-password'}
          />
          {mode === 'signup' && (
            <TextInput
              style={styles.input}
              placeholder="Display name (optional)"
              placeholderTextColor={StickiesColors.inkMuted}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.continueWrap, loading && styles.continueDisabled]}
            onPress={mode === 'signin' ? handleSupabaseLogin : handleSupabaseSignUp}
            disabled={loading}
          >
            <StickyCard backgroundColor={StickiesColors.green} softShadow style={styles.continueSticky}>
              {loading ? (
                <ActivityIndicator color={StickiesColors.ink} />
              ) : (
                <Text style={styles.continueText}>
                  {mode === 'signin' ? 'Sign in' : 'Sign up'}
                </Text>
              )}
            </StickyCard>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchMode}
            onPress={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
            }}
          >
            <Text style={styles.switchModeText}>
              {mode === 'signin'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
          onPress={handleMockLogin}
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
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  topSpacer: { flex: 1 },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 56, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: StickiesColors.ink },
  subtitle: {
    fontSize: 16,
    color: StickiesColors.inkMuted,
    marginBottom: 20,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: StickiesColors.grayDark,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: StickiesColors.ink,
    marginBottom: 12,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
    marginBottom: 12,
  },
  switchMode: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchModeText: {
    color: StickiesColors.inkMuted,
    fontSize: 14,
  },
  bottomSection: { flex: 1 },
  formContent: { padding: 24, paddingBottom: 48 },
  userBtnWrap: { marginBottom: 12 },
  userSticky: { padding: 16 },
  userStickySelected: { borderWidth: 2, borderColor: StickiesColors.ink },
  userName: { fontSize: 17, fontWeight: '600', color: StickiesColors.ink },
  userId: { fontSize: 14, color: StickiesColors.inkMuted, marginTop: 2 },
  continueWrap: { marginTop: 28 },
  continueDisabled: { opacity: 0.6 },
  continueSticky: { padding: 16, alignItems: 'center' },
  continueText: { color: StickiesColors.ink, fontSize: 17, fontWeight: '600' },
});
