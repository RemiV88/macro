import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Platform } from 'react-native';
import {
  LogOut,
  NotepadText,
  BookOpen,
  Hamburger,
  Utensils,
  User,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../components/ConfirmModal';
import { colors, spacing, radius, typography } from '../../theme';

function HeaderLogoutButton() {
  const { logout } = useAuth();
  const { ask, modal } = useConfirm();

  async function handlePress() {
    const ok = await ask({
      title: 'Log out?',
      message: 'Are you sure you want to log out?',
      confirmLabel: 'Log out',
    });
    if (!ok) return;
    await logout();
  }

  return (
    <>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Log out"
      >
        <LogOut size={18} color={colors.accent} />
      </Pressable>
      {modal}
    </>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: typography.fontFamily.semibold },
        headerRight: () => <HeaderLogoutButton />,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: typography.fontFamily.medium,
          fontSize: typography.sizes.caption,
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused, size }) => (
            <NotepadText
              size={size ?? 22}
              color={focused ? colors.accent : colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused, size }) => (
            <BookOpen
              size={size ?? 22}
              color={focused ? colors.accent : colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="foods"
        options={{
          title: 'Foods',
          tabBarIcon: ({ focused, size }) => (
            <Hamburger
              size={size ?? 22}
              color={focused ? colors.accent : colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: 'Meals',
          tabBarIcon: ({ focused, size }) => (
            <Utensils
              size={size ?? 22}
              color={focused ? colors.accent : colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, size }) => (
            <User
              size={size ?? 22}
              color={focused ? colors.accent : colors.textMuted}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent + '33',
    backgroundColor: colors.accentMuted,
    marginRight: spacing.lg,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 12px rgba(0, 148, 232, 0.12)',
        transitionDuration: '120ms',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
});
