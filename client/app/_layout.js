import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';

const PUBLIC_ROUTES = new Set(['login', 'signup']);

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const first = segments[0]; // e.g. 'login', 'signup', 'onboarding', '(tabs)', or undefined for index
    const inPublic = PUBLIC_ROUTES.has(first);
    const inOnboarding = first === 'onboarding';
    const inTabs = first === '(tabs)';

    if (!user) {
      // Not signed in — only allow login/signup. Send everyone else to login.
      if (!inPublic) router.replace('/login');
      return;
    }

    if (!user.onboardingComplete) {
      // Signed in but not onboarded — force onboarding.
      if (!inOnboarding) router.replace('/onboarding');
      return;
    }

    // Fully authenticated — keep them out of auth/onboarding screens.
    if (inPublic || inOnboarding || !inTabs) {
      router.replace('/(tabs)/today');
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

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

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
