import { Stack } from 'expo-router';
import { colors, typography } from '../../theme';

export default function HistoryStackLayout() {
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
      <Stack.Screen name="[date]" options={{ title: 'Day' }} />
    </Stack>
  );
}
