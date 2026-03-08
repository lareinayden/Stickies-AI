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
import { supabase } from '../src/lib/supabase';
import { StickyCard } from '../src/components/StickyCard';
import { StickiesColors } from '../src/theme/stickies';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async () => {
    if (!supabase) {
      setError('Supabase not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Email and password are required.');
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: displayName.trim() ? { data: { display_name: displayName.trim() } } : undefined,
        });
        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }
        if (data.session) {
          router.replace('/(tabs)');
          return;
        }
        setSuccess('Check your email to confirm your account.');
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (signInError) {
          setError(signInError.message);
          setLoading(false);
          return;
        }
        if (data.session) {
          router.replace('/(tabs)');
          return;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
          {isSignUp ? 'Create an account' : 'Sign in to continue'}
        </Text>

        <StickyCard backgroundColor={StickiesColors.gray} softShadow style={styles.formCard}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={StickiesColors.inkMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!loading}
          />
          {isSignUp && (
            <>
              <Text style={[styles.label, { marginTop: 12 }]}>Display name (optional)</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={StickiesColors.inkMuted}
                editable={!loading}
              />
            </>
          )}
          <Text style={[styles.label, { marginTop: isSignUp ? 12 : 12 }]}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={StickiesColors.inkMuted}
            secureTextEntry
            editable={!loading}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {success ? <Text style={styles.successText}>{success}</Text> : null}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <StickyCard backgroundColor={StickiesColors.green} softShadow style={styles.submitSticky}>
              {loading ? (
                <ActivityIndicator color={StickiesColors.ink} />
              ) : (
                <Text style={styles.submitText}>{isSignUp ? 'Sign up' : 'Sign in'}</Text>
              )}
            </StickyCard>
          </TouchableOpacity>
        </StickyCard>

        <TouchableOpacity
          style={styles.switchMode}
          onPress={() => {
            setIsSignUp(!isSignUp);
            setError(null);
            setSuccess(null);
          }}
        >
          <Text style={styles.switchModeText}>
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  hero: {
    alignItems: 'center',
    marginTop: 48,
    marginBottom: 24,
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
  subtitle: {
    fontSize: 16,
    color: StickiesColors.inkMuted,
    marginBottom: 20,
  },
  formCard: {
    padding: 18,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: StickiesColors.ink,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: StickiesColors.grayDark,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: StickiesColors.ink,
  },
  errorText: {
    fontSize: 14,
    color: '#b91c1c',
    marginTop: 12,
  },
  successText: {
    fontSize: 14,
    color: StickiesColors.success,
    marginTop: 12,
  },
  submitBtn: {
    marginTop: 20,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitSticky: {
    padding: 16,
    alignItems: 'center',
  },
  submitText: {
    color: StickiesColors.ink,
    fontSize: 17,
    fontWeight: '600',
  },
  switchMode: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchModeText: {
    fontSize: 15,
    color: StickiesColors.inkMuted,
  },
});
