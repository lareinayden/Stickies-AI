import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = 'stickies_user_id';

export default function Account() {
  const router = useRouter();

  const handleLogout = async () => {
    await AsyncStorage.removeItem(USER_KEY);
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account</Text>
      <Text style={styles.hint}>Mock auth. Log out to switch user.</Text>
      <TouchableOpacity style={styles.logout} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  hint: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 24,
  },
  logout: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
});
