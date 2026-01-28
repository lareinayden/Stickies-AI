/**
 * Simple auth hook – stores userId in AsyncStorage.
 * Mock users only (shirley, yixiao, guest).
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = 'stickies_user_id';

export function useAuth() {
  const [userId, setUserIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(USER_KEY).then((id) => {
      setUserIdState(id);
      setLoading(false);
    });
  }, []);

  const setUserId = useCallback((id: string | null) => {
    if (id) {
      AsyncStorage.setItem(USER_KEY, id);
      setUserIdState(id);
    } else {
      AsyncStorage.removeItem(USER_KEY);
      setUserIdState(null);
    }
  }, []);

  const signOut = useCallback(() => {
    setUserId(null);
  }, []);

  return { userId, setUserId, signOut, loading };
}
