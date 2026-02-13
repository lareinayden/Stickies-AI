import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="add-note"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'New note',
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
