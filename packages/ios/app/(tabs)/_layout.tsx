import { Tabs } from 'expo-router';
import { StickiesColors } from '../../src/theme/stickies';

export default function TabsLayout() {
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
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarLabel: 'Home' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarLabel: 'Tasks' }} />
      <Tabs.Screen name="learning-stickies" options={{ title: 'Learning', tabBarLabel: 'Learning' }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarLabel: 'Account' }} />
    </Tabs>
  );
}
