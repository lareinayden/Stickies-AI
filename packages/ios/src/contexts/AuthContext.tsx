/**
 * Auth context – provides user + auth object for API calls
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Auth } from '../api/client';

const MOCK_USER_KEY = 'stickies_user_id';

interface AuthUser {
  id: string;
  displayName: string;
  accessToken?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  auth: Auth | null;
  loading: boolean;
  setMockUserId: (id: string | null) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const auth: Auth | null = user
    ? { userId: user.id, accessToken: user.accessToken ?? undefined }
    : null;

  useEffect(() => {
    const init = async () => {
      if (isSupabaseConfigured) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            displayName:
              session.user.user_metadata?.display_name ??
              session.user.email?.split('@')[0] ??
              'User',
            accessToken: session.access_token,
          });
          setLoading(false);
          return;
        }
      }
      const mockId = await AsyncStorage.getItem(MOCK_USER_KEY);
      if (mockId) {
        setUser({ id: mockId, displayName: mockId });
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    init();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            displayName:
              session.user.user_metadata?.display_name ??
              session.user.email?.split('@')[0] ??
              'User',
            accessToken: session.access_token,
          });
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const setMockUserId = useCallback(async (id: string | null) => {
    if (id) {
      await AsyncStorage.setItem(MOCK_USER_KEY, id);
      setUser({ id, displayName: id });
    } else {
      await AsyncStorage.removeItem(MOCK_USER_KEY);
      setUser(null);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    await AsyncStorage.removeItem(MOCK_USER_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, auth, loading, setMockUserId, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
