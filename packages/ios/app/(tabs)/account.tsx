import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useOnboarding } from '../../src/contexts/OnboardingContext';
import { StickyCard } from '../../src/components/StickyCard';
import { StickiesColors } from '../../src/theme/stickies';

export default function Account() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { requestReplay } = useOnboarding();

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  const handleShowGuideAgain = () => {
    requestReplay();
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <StickyCard backgroundColor={StickiesColors.gray} softShadow style={styles.card}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.hint}>Signed in with Supabase. Log out to switch account.</Text>
        <TouchableOpacity style={styles.guideAgain} onPress={handleShowGuideAgain}>
          <Text style={styles.guideAgainText}>Show guide again</Text>
        </TouchableOpacity>
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
  guideAgain: {
    backgroundColor: 'rgba(28,25,23,0.06)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: StickiesColors.grayDark,
    marginBottom: 12,
  },
  guideAgainText: {
    fontSize: 16,
    fontWeight: '600',
    color: StickiesColors.ink,
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
