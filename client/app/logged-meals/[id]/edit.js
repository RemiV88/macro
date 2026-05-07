import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Save, Trash2 } from 'lucide-react-native';
import {
  getLoggedMeal,
  updateLoggedMeal,
  deleteLoggedMeal,
} from '../../../api/loggedMeals';
import ChipRow from '../../../components/ChipRow';
import Button from '../../../components/Button';
import { useConfirm } from '../../../components/ConfirmModal';
import {
  MEAL_SLOTS,
  slotLabel,
  normalizeLoggedItem,
  itemKcal,
} from '../../../utils/macros';
import { colors, spacing, radius, typography } from '../../../theme';

const SLOT_OPTIONS = MEAL_SLOTS.map((s) => ({ value: s, label: slotLabel(s) }));

export default function EditLoggedMeal() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { ask: askConfirm, modal: confirmModal } = useConfirm();

  const [meal, setMeal] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [mealSlot, setMealSlot] = useState('breakfast');
  const [itemDrafts, setItemDrafts] = useState([]); // { _id, name, portionGrams (string), caloriesPer100g, ... }
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const found = await getLoggedMeal(id);
        if (!cancelled) {
          setMeal(found);
          setMealSlot(found.mealSlot);
          setItemDrafts(
            (found.items || []).map((it) => {
              const norm = normalizeLoggedItem(it);
              return { ...norm, portionGramsStr: String(norm.portionGrams) };
            })
          );
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err?.response?.data?.error || err.message || 'Could not load');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function setItemPortion(idx, val) {
    setItemDrafts((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, portionGramsStr: val } : it))
    );
  }

  async function handleSave() {
    setError(null);
    const items = [];
    for (const [idx, it] of itemDrafts.entries()) {
      const n = Number(it.portionGramsStr);
      if (!Number.isFinite(n) || n < 0) {
        setError(`Item ${idx + 1}: portion must be 0 or more`);
        return;
      }
      items.push({ _id: it._id, portionGrams: n });
    }
    setSubmitting(true);
    try {
      await updateLoggedMeal(id, { mealSlot, items });
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/today');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not save');
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    const ok = await askConfirm({
      title: 'Delete logged meal',
      message: "Are you sure you want to delete this logged meal? This can't be undone.",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteLoggedMeal(id);
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/today');
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

  function handleCancel() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/today');
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{loadError}</Text>
      </View>
    );
  }
  if (!meal) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.field}>
        <Text style={styles.label}>Meal slot</Text>
        <ChipRow
          options={SLOT_OPTIONS}
          value={mealSlot}
          onChange={setMealSlot}
          disabled={submitting || deleting}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Items</Text>
        {itemDrafts.length === 0 ? (
          <Text style={styles.emptyText}>This meal has no items.</Text>
        ) : (
          itemDrafts.map((it, idx) => {
            const grams = Number(it.portionGramsStr) || 0;
            const kcal = Math.round(itemKcal({ ...it, portionGrams: grams }));
            return (
              <View key={it._id || idx} style={styles.itemRow}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                  <Text style={styles.itemKcal}>{kcal} kcal</Text>
                </View>
                <View style={styles.portionField}>
                  <Text style={styles.portionLabel}>Portion (g)</Text>
                  <TextInput
                    value={it.portionGramsStr}
                    onChangeText={(v) => setItemPortion(idx, v)}
                    keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                    style={styles.portionInput}
                    editable={!submitting && !deleting}
                  />
                </View>
              </View>
            );
          })
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actionsRow}>
        <Pressable
          onPress={handleSave}
          disabled={submitting || deleting}
          style={({ pressed }) => [
            styles.glassBtn,
            styles.submitBtn,
            pressed && styles.btnPressed,
            (submitting || deleting) && styles.btnDisabled,
          ]}
          accessibilityRole="button"
        >
          {submitting ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <>
              <Save size={18} color={colors.accent} />
              <Text style={styles.submitText}>Save</Text>
            </>
          )}
        </Pressable>
        <Pressable
          onPress={handleCancel}
          disabled={submitting || deleting}
          style={({ pressed }) => [
            styles.cancelBtn,
            pressed && styles.btnPressed,
            (submitting || deleting) && styles.btnDisabled,
          ]}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      <Button
        icon={<Trash2 size={20} color={colors.danger} />}
        variant="danger"
        onPress={handleDelete}
        loading={deleting}
        disabled={submitting}
      />

      {confirmModal}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.xl, gap: spacing.lg },
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
  field: { gap: spacing.sm },
  label: {
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
    gap: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.md,
  },
  itemName: {
    flex: 1,
    color: colors.text,
    fontSize: typography.sizes.bodyLg,
    fontFamily: typography.fontFamily.semibold,
  },
  itemKcal: {
    color: colors.accent,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
  },
  portionField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  portionLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  portionInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
    color: colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  glassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
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
  submitBtn: {
    minWidth: 120,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent + '33',
  },
  submitText: {
    color: colors.accent,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
  },
  cancelBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  cancelText: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  btnDisabled: { opacity: 0.5 },
  error: {
    color: colors.danger,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
});
