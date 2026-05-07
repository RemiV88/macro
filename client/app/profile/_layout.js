import { Stack } from 'expo-router';
import { colors, typography } from '../../theme';

export default function ProfileModalLayout() {
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
      <Stack.Screen name="edit" options={{ title: 'Edit profile' }} />
    </Stack>
  );
}
