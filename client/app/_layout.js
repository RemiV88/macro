import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { colors, typography } from '../theme';

const PUBLIC_ROUTES = new Set(['login', 'signup']);
const AUTHED_STACKS = new Set(['foods', 'meals', 'logged-meals', 'profile']);

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const first = segments[0]; // e.g. 'login', 'signup', 'onboarding', '(tabs)', 'foods', 'meals', 'logged-meals', or undefined for index
    const inPublic = PUBLIC_ROUTES.has(first);
    const inOnboarding = first === 'onboarding';
    const inTabs = first === '(tabs)';
    const inAuthedStack = AUTHED_STACKS.has(first);

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
    if (inPublic || inOnboarding || (!inTabs && !inAuthedStack)) {
      router.replace('/(tabs)/today');
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="login"
        options={{
          headerShown: true,
          title: 'Log in',
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: typography.fontFamily.semibold },
        }}
      />
      <Stack.Screen
        name="signup"
        options={{
          headerShown: true,
          title: 'Sign up',
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: typography.fontFamily.semibold },
        }}
      />
      <Stack.Screen
        name="onboarding"
        options={{
          headerShown: true,
          title: 'Onboarding',
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: typography.fontFamily.semibold },
        }}
      />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="foods" />
      <Stack.Screen name="meals" />
      <Stack.Screen name="logged-meals" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
