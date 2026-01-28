import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = 'stickies_user_id';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem(USER_KEY).then((userId) => {
      if (userId) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    });
  }, [router]);

  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});
