/**
 * Auth hook using Supabase session.
 * Returns userId (Supabase user id), signOut, and loading.
 * Session is persisted via Supabase client (AsyncStorage).
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [userId, setUserIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const getInitial = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const id = session?.user?.id ?? null;
      setUserIdState(id);
      setLoading(false);
    };
    getInitial();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserIdState(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const setUserId = useCallback((id: string | null) => {
    if (id) {
      setUserIdState(id);
    } else {
      setUserIdState(null);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUserIdState(null);
  }, []);

  return { userId, setUserId, signOut, loading };
}

/** For API client: get current session (access_token). */
export async function getSupabaseSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
