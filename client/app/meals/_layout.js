import { Stack } from 'expo-router';
import { colors, typography } from '../../theme';

export default function MealsModalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        animation: 'slide_from_right',
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: typography.fontFamily.semibold },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="new" options={{ title: 'New meal template' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Meal template' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Edit meal template' }} />
    </Stack>
  );
}
