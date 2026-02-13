import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Platform } from 'react-native';
import { StickiesColors } from '../../src/theme/stickies';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: StickiesColors.ink,
        tabBarInactiveTintColor: StickiesColors.inkLight,
        tabBarStyle: {
          backgroundColor: StickiesColors.deskAlt,
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 32 : 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: StickiesColors.desk,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: StickiesColors.ink,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={focused ? 'house.fill' : 'house'}
              tintColor={color}
              size={24}
              type="hierarchical"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarLabel: 'Tasks',
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={focused ? 'checklist.checked' : 'checklist'}
              tintColor={color}
              size={24}
              type="hierarchical"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="learning-stickies"
        options={{
          title: 'Learning',
          tabBarLabel: 'Learning',
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={focused ? 'brain.fill' : 'brain'}
              tintColor={color}
              size={24}
              type="hierarchical"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarLabel: 'Account',
          tabBarIcon: ({ color, focused }) => (
            <SymbolView
              name={focused ? 'person.crop.circle.fill' : 'person.crop.circle'}
              tintColor={color}
              size={24}
              type="hierarchical"
            />
          ),
        }}
      />
    </Tabs>
  );
}
