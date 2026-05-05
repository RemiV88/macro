import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" options={{ headerShown: true, title: 'Log in' }} />
      <Stack.Screen name="signup" options={{ headerShown: true, title: 'Sign up' }} />
      <Stack.Screen name="onboarding" options={{ headerShown: true, title: 'Onboarding' }} />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
