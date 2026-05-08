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
import { getMealTemplate, deleteMealTemplate } from '../../../api/mealTemplates';
import { useConfirm } from '../../../components/ConfirmModal';
import ScreenBackground from '../../../components/ScreenBackground';
import {
  computeMealTotals,
  itemKcal,
  normalizeTemplateItem,
  slotLabel,
} from '../../../utils/macros';
import { colors, spacing, radius, typography } from '../../../theme';

export default function MealTemplateDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { ask: askConfirm, modal: confirmModal } = useConfirm();

  const [template, setTemplate] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoadError(null);
      (async () => {
        try {
          const data = await getMealTemplate(id);
          if (!cancelled) setTemplate(data);
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
    router.push(`/meals/${id}/edit`);
  }

  async function handleDelete() {
    const ok = await askConfirm({
      title: 'Delete meal template',
      message: `Are you sure you want to delete "${template?.name || 'this meal'}"? This can't be undone.`,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteMealTemplate(id);
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/meals');
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
        <Stack.Screen options={{ title: 'Meal' }} />
        <Text style={styles.errorText}>{loadError}</Text>
      </View>
    );
  }

  if (!template) {
    return (
      <View style={styles.center}>
        <ScreenBackground />
        <Stack.Screen options={{ title: 'Meal' }} />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const items = (template.items || []).map(normalizeTemplateItem);
  const totals = computeMealTotals(items);
  const macros = [
    { label: 'Calories', value: String(Math.round(totals.kcal)), Icon: Zap },
    { label: 'Protein', value: `${Math.round(totals.protein)}g`, Icon: BicepsFlexed },
    { label: 'Carbs', value: `${Math.round(totals.carbs)}g`, Icon: Wheat },
    { label: 'Fat', value: `${Math.round(totals.fat)}g`, Icon: Cuboid },
  ];

  return (
    <View style={styles.outer}>
      <ScreenBackground />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: template.name }} />

      <View style={styles.headerBlock}>
        <Text style={styles.title}>{template.name}</Text>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{slotLabel(template.mealSlot)}</Text>
        </View>
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
      <Text style={styles.caption}>Totals across all items</Text>

      <View style={styles.itemsBlock}>
        <Text style={styles.sectionLabel}>Foods</Text>
        {items.length === 0 ? (
          <Text style={styles.emptyText}>No foods in this meal yet.</Text>
        ) : (
          items.map((it, idx) => (
            <View key={`${it.foodId}-${idx}`} style={styles.itemRow}>
              <View style={styles.itemText}>
                <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                <Text style={styles.itemMeta}>
                  {Math.round(it.portionGrams)}g · {Math.round(itemKcal(it))} kcal
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

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
  itemsBlock: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  emptyText: {
    color: colors.textDim,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.regular,
    fontStyle: 'italic',
  },
  itemRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  itemText: { gap: 2 },
  itemName: {
    color: colors.text,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
  },
  itemMeta: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.regular,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  btnDisabled: { opacity: 0.5 },
});
