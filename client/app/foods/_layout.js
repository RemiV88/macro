import { Stack } from 'expo-router';
import { colors, typography } from '../../theme';

export default function FoodsModalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: typography.fontFamily.semibold },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="new" options={{ title: 'Add food' }} />
      <Stack.Screen name="search" options={{ title: 'Search USDA' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Food' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Edit food' }} />
    </Stack>
  );
}
