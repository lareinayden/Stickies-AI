import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { StickiesColors } from '../../src/theme/stickies';
import { useAuthContext } from '../../src/contexts/AuthContext';

export default function TabsLayout() {
  const router = useRouter();
  const { auth, loading } = useAuthContext();

  useEffect(() => {
    if (!loading && !auth) {
      router.replace('/login');
    }
  }, [auth, loading, router]);

  if (!auth && !loading) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#b45309',
        tabBarInactiveTintColor: StickiesColors.inkLight,
        tabBarStyle: { backgroundColor: StickiesColors.deskAlt },
        headerStyle: { backgroundColor: StickiesColors.desk },
        headerTintColor: StickiesColors.ink,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          headerShown: false,
        }}
      />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarLabel: 'Tasks' }} />
      <Tabs.Screen name="learning-stickies" options={{ title: 'Learning', tabBarLabel: 'Learning' }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarLabel: 'Account' }} />
    </Tabs>
  );
}
