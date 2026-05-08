import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pencil, Trash2, Zap, BicepsFlexed, Wheat, Cuboid } from 'lucide-react-native';
import { getFood, deleteFood } from '../../../api/foods';
import { useConfirm } from '../../../components/ConfirmModal';
import { categoryIcons } from '../../../components/categoryIcons';
import ScreenBackground from '../../../components/ScreenBackground';
import { colors, spacing, radius, typography } from '../../../theme';

function categoryLabel(c) {
  if (!c) return '';
  return c.charAt(0).toUpperCase() + c.slice(1);
}

export default function FoodDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { ask: askConfirm, modal: confirmModal } = useConfirm();

  const [food, setFood] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoadError(null);
      (async () => {
        try {
          const data = await getFood(id);
          if (!cancelled) setFood(data);
        } catch (err) {
          if (!cancelled) {
            setLoadError(err?.response?.data?.error || err.message || 'Could not load');
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [id])
  );

  function goEdit() {
    router.push(`/foods/${id}/edit`);
  }

  async function handleDelete() {
    const ok = await askConfirm({
      title: 'Delete food',
      message: `Are you sure you want to delete "${food?.name || 'this food'}"? This can't be undone.`,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteFood(id);
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/foods');
    } catch (err) {
      setDeleting(false);
      const msg = err?.response?.data?.error || err.message || 'Could not delete';
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    }
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <ScreenBackground />
        <Stack.Screen options={{ title: 'Food' }} />
        <Text style={styles.errorText}>{loadError}</Text>
      </View>
    );
  }

  if (!food) {
    return (
      <View style={styles.center}>
        <ScreenBackground />
        <Stack.Screen options={{ title: 'Food' }} />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const macros = [
    { label: 'Calories', value: String(Math.round(food.caloriesPer100g)), Icon: Zap },
    { label: 'Protein', value: `${Math.round(food.proteinPer100g)}g`, Icon: BicepsFlexed },
    { label: 'Carbs', value: `${Math.round(food.carbsPer100g)}g`, Icon: Wheat },
    { label: 'Fat', value: `${Math.round(food.fatPer100g)}g`, Icon: Cuboid },
  ];

  return (
    <View style={styles.outer}>
      <ScreenBackground />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: food.name }} />

      <View style={styles.headerBlock}>
        <Text style={styles.title}>{food.name}</Text>
        {food.category ? (() => {
          const CategoryIcon = categoryIcons[food.category];
          return (
            <View style={styles.chip}>
              {CategoryIcon ? <CategoryIcon size={16} color={colors.accent} /> : null}
              <Text style={styles.chipText}>{categoryLabel(food.category)}</Text>
            </View>
          );
        })() : null}
      </View>

      <View style={styles.grid}>
        {macros.map(({ label, value, Icon }) => (
          <View key={label} style={styles.cell}>
            <Text style={styles.cellValue}>{value}</Text>
            <View style={styles.labelRow}>
              <Icon size={14} color={colors.textMuted} />
              <Text style={styles.cellLabel}>{label}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.caption}>All values per 100g</Text>

      <View style={styles.actions}>
        <Pressable
          onPress={goEdit}
          disabled={deleting}
          style={({ pressed }) => [
            styles.glassBtn,
            styles.editBtn,
            pressed && styles.btnPressed,
            deleting && styles.btnDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Edit"
        >
          <Pencil size={18} color={colors.accent} />
          <Text style={styles.editBtnText}>Edit</Text>
        </Pressable>
        <Pressable
          onPress={handleDelete}
          disabled={deleting}
          style={({ pressed }) => [
            styles.glassBtn,
            styles.deleteBtn,
            pressed && styles.btnPressed,
            deleting && styles.btnDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Delete"
        >
          {deleting ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <Trash2 size={20} color={colors.danger} />
          )}
        </Pressable>
      </View>

      {confirmModal}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  container: {
    padding: spacing.xl,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: spacing.xl,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
  },
  headerBlock: {
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.h1,
    fontFamily: typography.fontFamily.bold,
  },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accentMuted,
    borderRadius: radius.md,
  },
  chipText: {
    color: colors.accent,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.semibold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  cell: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cellValue: {
    color: colors.accent,
    fontSize: typography.sizes.h1,
    fontFamily: typography.fontFamily.bold,
  },
  cellLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  caption: {
    color: colors.textDim,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  glassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
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
    minWidth: 110,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent + '33',
  },
  editBtnText: {
    color: colors.accent,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
  },
  deleteBtn: {
    width: 48,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
