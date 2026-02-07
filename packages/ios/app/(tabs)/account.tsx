import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StickyCard } from '../../src/components/StickyCard';
import { StickiesColors } from '../../src/theme/stickies';

const USER_KEY = 'stickies_user_id';

export default function Account() {
  const router = useRouter();

  const handleLogout = async () => {
    await AsyncStorage.removeItem(USER_KEY);
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <StickyCard backgroundColor={StickiesColors.gray} softShadow style={styles.card}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.hint}>Mock auth. Log out to switch user.</Text>
        <TouchableOpacity style={styles.logout} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </StickyCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: StickiesColors.desk,
  },
  card: {
    padding: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: StickiesColors.ink,
    marginBottom: 6,
  },
  hint: {
    fontSize: 15,
    color: StickiesColors.inkMuted,
    marginBottom: 20,
  },
  logout: {
    backgroundColor: 'rgba(28,25,23,0.06)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: StickiesColors.grayDark,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: StickiesColors.ink,
  },
});
