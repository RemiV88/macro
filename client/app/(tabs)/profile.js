import { View, Text, Image, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { CircleUser, Pencil, Scale } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import ScreenBackground from '../../components/ScreenBackground';
import { colors, spacing, radius, typography } from '../../theme';

const AVATAR_SIZE = 88;

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function activityLabel(level) {
  if (!level) return '';
  return capitalize(String(level).replace(/_/g, ' '));
}

function buildStats(user) {
  if (!user) return [];
  const showStarting =
    user.startingWeightKg != null && user.startingWeightKg !== user.weightKg;
  const rows = [
    { label: 'Gender', value: user.gender ? capitalize(user.gender) : null },
    { label: 'Age', value: user.age != null ? String(user.age) : null },
    { label: 'Height', value: user.heightCm != null ? `${user.heightCm} cm` : null },
    { label: 'Weight', value: user.weightKg != null ? `${user.weightKg} kg` : null },
    user.hasFitnessTracker
      ? {
          label: 'Daily burn',
          value: user.dailyBurnKcal != null ? `${user.dailyBurnKcal} kcal` : null,
        }
      : { label: 'Activity', value: activityLabel(user.activityLevel) },
    { label: 'Goal', value: user.goal ? capitalize(user.goal) : null },
    showStarting
      ? { label: 'Starting weight', value: `${user.startingWeightKg} kg` }
      : null,
  ];
  return rows.filter((r) => r && r.value);
}

export default function Profile() {
  const router = useRouter();
  const { user } = useAuth();
  const stats = buildStats(user);

  return (
    <View style={styles.container}>
      <ScreenBackground />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.page}>
      <View style={styles.outerCard}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            {user?.profileImageUrl ? (
              <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImage} />
            ) : (
              <CircleUser size={Math.round(AVATAR_SIZE * 0.5)} color={colors.accent} />
            )}
          </View>
          {user?.name ? <Text style={styles.name}>{user.name}</Text> : null}
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
        </View>

        <Pressable
          onPress={() => router.push('/profile/edit')}
          style={({ pressed }) => [
            styles.glassBtn,
            styles.editBtn,
            pressed && styles.btnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
        >
          <Pencil size={18} color={colors.accent} />
          <Text style={styles.editBtnText}>Edit profile</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/weight')}
          style={({ pressed }) => [
            styles.glassBtn,
            styles.editBtn,
            pressed && styles.btnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Weight"
        >
          <Scale size={18} color={colors.accent} />
          <Text style={styles.editBtnText}>Weight</Text>
        </Pressable>

        {user?.dailyCalorieTarget ? (
          <View style={styles.innerCard}>
            <Text style={styles.cardLabel}>Daily target</Text>
            <Text style={styles.cardValue}>{user.dailyCalorieTarget} kcal</Text>
            <Text style={styles.cardMacros}>
              P {user.proteinTarget}g · C {user.carbsTarget}g · F {user.fatTarget}g
            </Text>
          </View>
        ) : null}

        {stats.length > 0 ? (
          <View style={styles.innerCard}>
            <Text style={styles.cardLabel}>Stats</Text>
            <View style={styles.statList}>
              {stats.map((row, idx) => (
                <View
                  key={row.label}
                  style={[styles.statRow, idx < stats.length - 1 && styles.statRowDivider]}
                >
                  <Text style={styles.statKey}>{row.label}</Text>
                  <Text style={styles.statValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  page: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  outerCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 148, 232, 0.06)',
      },
      default: {
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
    }),
  },
  identity: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    resizeMode: 'cover',
  },
  name: {
    color: colors.text,
    fontSize: typography.sizes.h2,
    fontFamily: typography.fontFamily.bold,
  },
  email: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  glassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    minWidth: 160,
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
  editBtn: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent + '33',
  },
  editBtnText: {
    color: colors.accent,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  innerCard: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardLabel: {
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardValue: {
    fontSize: typography.sizes.h3,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text,
  },
  cardMacros: {
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
  },
  statList: {
    marginTop: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statKey: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  statValue: {
    color: colors.text,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
  },
});
