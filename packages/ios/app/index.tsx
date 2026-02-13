import { Redirect } from 'expo-router';
import { useAuthContext } from '../src/contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { StickiesColors } from '../src/theme/stickies';

/**
 * Root entry route.
 * Redirects to login when not authenticated, or to the tab layout when logged in.
 */
export default function Index() {
  const { auth, loading } = useAuthContext();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: StickiesColors.desk,
        }}
      >
        <ActivityIndicator color={StickiesColors.ink} />
      </View>
    );
  }

  // When not logged in, go to login screen
  if (!auth) {
    return <Redirect href="/login" />;
  }

  // When logged in, go to the tabbed app
  return <Redirect href="/(tabs)" />;
}

