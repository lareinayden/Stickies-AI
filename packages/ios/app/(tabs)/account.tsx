import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { StickyCard } from '../../src/components/StickyCard';
import { StickiesColors } from '../../src/theme/stickies';
import { useAuthContext } from '../../src/contexts/AuthContext';

export default function Account() {
  const router = useRouter();
  const { user, signOut } = useAuthContext();

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <StickyCard backgroundColor={StickiesColors.gray} softShadow style={styles.card}>
        <Text style={styles.title}>Account</Text>
        {user ? (
          <Text style={styles.hint}>
            {user.displayName} • {user.accessToken ? 'Signed in with Supabase' : 'Mock user'}
          </Text>
        ) : (
          <Text style={styles.hint}>Not signed in</Text>
        )}
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
