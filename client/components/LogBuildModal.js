import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { X, Plus, Save } from 'lucide-react-native';
import FoodPickerModal from './FoodPickerModal';
import ChipRow from './ChipRow';
import { createLoggedMeal, localDateString } from '../api/loggedMeals';
import {
  MEAL_SLOTS,
  slotLabel,
  itemKcal,
  computeMealTotals,
} from '../utils/macros';
import { colors, spacing, radius, typography } from '../theme';

const SLOT_OPTIONS = MEAL_SLOTS.map((s) => ({ value: s, label: slotLabel(s) }));

export default function LogBuildModal({ visible, onClose, onLogged, defaultSlot = 'lunch' }) {
  const [slot, setSlot] = useState(defaultSlot);
  const [items, setItems] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setItems([]);
      setError(null);
      setSubmitting(false);
      setSlot(defaultSlot);
    }
  }, [visible, defaultSlot]);

  function handlePick(item) {
    setItems((prev) => [
      ...prev,
      {
        foodId: item.foodId,
        name: item.foodName,
        portionGrams: item.portionGrams,
        caloriesPer100g: item.caloriesPer100g,
        proteinPer100g: item.proteinPer100g,
        carbsPer100g: item.carbsPer100g,
        fatPer100g: item.fatPer100g,
      },
    ]);
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setError(null);
    if (items.length === 0) {
      setError('Add at least one food');
      return;
    }
    setSubmitting(true);
    try {
      const logged = await createLoggedMeal({
        mealSlot: slot,
        date: localDateString(),
        items: items.map((it) => ({
          foodId: it.foodId || null,
          foodName: it.name,
          portionGrams: it.portionGrams,
          caloriesPer100g: it.caloriesPer100g,
          proteinPer100g: it.proteinPer100g,
          carbsPer100g: it.carbsPer100g,
          fatPer100g: it.fatPer100g,
        })),
      });
      onLogged?.(logged);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not log');
      setSubmitting(false);
    }
  }

  const totals = computeMealTotals(items);

  return (
    <>
    <Modal visible={!!visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.iconBtnSpacer} />
            <Text style={styles.title}>Build a meal</Text>
            <Pressable style={styles.iconBtn} onPress={onClose}>
              <X size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.content}>
            <View style={styles.field}>
              <Text style={styles.label}>Meal slot</Text>
              <ChipRow options={SLOT_OPTIONS} value={slot} onChange={setSlot} disabled={submitting} />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Foods</Text>
              {items.length === 0 ? (
                <Text style={styles.emptyText}>No foods yet.</Text>
              ) : (
                <View style={styles.itemList}>
                  {items.map((it, idx) => (
                    <View key={`${it.foodId}-${idx}`} style={styles.itemRow}>
                      <View style={styles.itemText}>
                        <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                        <Text style={styles.itemMeta}>
                          {Math.round(it.portionGrams)}g · {Math.round(itemKcal(it))} kcal
                        </Text>
                      </View>
                      <Pressable
                        style={({ pressed }) => [styles.removeBtn, pressed && styles.btnPressed]}
                        onPress={() => removeItem(idx)}
                        hitSlop={8}
                      >
                        <X size={18} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
              <Pressable
                onPress={() => setPickerOpen(true)}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.glassBtn,
                  styles.addBtn,
                  pressed && styles.btnPressed,
                  submitting && styles.btnDisabled,
                ]}
              >
                <Plus size={18} color={colors.accent} />
                <Text style={styles.addBtnText}>Add food</Text>
              </Pressable>
            </View>

            {items.length > 0 ? (
              <View style={styles.summary}>
                <Text style={styles.summaryKcal}>{Math.round(totals.kcal)} kcal</Text>
                <Text style={styles.summarySub}>
                  P {Math.round(totals.protein)}g · C {Math.round(totals.carbs)}g · F {Math.round(totals.fat)}g
                </Text>
              </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              onPress={handleSave}
              disabled={submitting}
              style={({ pressed }) => [
                styles.glassBtn,
                styles.saveBtn,
                pressed && styles.btnPressed,
                submitting && styles.btnDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <>
                  <Save size={18} color={colors.accent} />
                  <Text style={styles.saveText}>Save & log</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>

    <FoodPickerModal
      visible={pickerOpen}
      onClose={() => setPickerOpen(false)}
      onPick={handlePick}
      title="Add food to meal"
      allowQuickAdd
    />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: typography.sizes.h3,
    fontFamily: typography.fontFamily.semibold,
    textAlign: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  iconBtnSpacer: { width: 36, height: 36 },
  body: { flexGrow: 0 },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
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
  itemList: { gap: spacing.sm },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  itemText: { flex: 1, gap: 2 },
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
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  summary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  summaryKcal: {
    color: colors.accent,
    fontSize: typography.sizes.h2,
    fontFamily: typography.fontFamily.bold,
  },
  summarySub: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
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
  addBtn: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent + '33',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
  },
  addBtnText: {
    color: colors.accent,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
  },
  saveBtn: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent + '33',
  },
  saveText: {
    color: colors.accent,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
  },
  error: {
    color: colors.danger,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  btnDisabled: { opacity: 0.5 },
});
