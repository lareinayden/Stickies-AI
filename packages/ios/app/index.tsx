/**
 * Root index: redirect to login if not authenticated, otherwise to tabs.
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../src/hooks/useAuth';
import { StickiesColors } from '../src/theme/stickies';

export default function Index() {
  const router = useRouter();
  const { userId, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (userId) {
      router.replace('/(tabs)');
    } else {
      router.replace('/login');
    }
  }, [loading, userId, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={StickiesColors.ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: StickiesColors.desk,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
