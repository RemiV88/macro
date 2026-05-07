import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
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
import { MEAL_SLOTS, slotLabel, itemKcal } from '../utils/macros';
import { colors, spacing, radius, typography } from '../theme';

const SLOT_OPTIONS = MEAL_SLOTS.map((s) => ({ value: s, label: slotLabel(s) }));

export default function LogSingleFoodModal({ visible, onClose, onLogged }) {
  // The "Snack" entry on the action sheet routes here, so default the slot to
  // snack. The user can still change it via the chip row.
  const [slot, setSlot] = useState('snack');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState(null); // full inline item or null
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPicked(null);
      setError(null);
      setSubmitting(false);
      setSlot('snack');
    }
  }, [visible]);

  function handlePick(item) {
    setPicked(item);
  }

  async function handleSave() {
    setError(null);
    if (!picked) {
      setError('Pick a food first');
      return;
    }
    setSubmitting(true);
    try {
      const logged = await createLoggedMeal({
        mealSlot: slot,
        date: localDateString(),
        items: [
          {
            foodId: picked.foodId || null,
            foodName: picked.foodName,
            portionGrams: picked.portionGrams,
            caloriesPer100g: picked.caloriesPer100g,
            proteinPer100g: picked.proteinPer100g,
            carbsPer100g: picked.carbsPer100g,
            fatPer100g: picked.fatPer100g,
          },
        ],
      });
      onLogged?.(logged);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not log');
      setSubmitting(false);
    }
  }

  // The preview item used the old { food, portionGrams } shape with
  // food.caloriesPer100g and food.name. The picker now hands us a flat object
  // with caloriesPer100g + foodName already at the top level — adapt for the
  // existing JSX (which reads previewItem.name + caloriesPer100g).
  const previewItem = picked
    ? {
        name: picked.foodName,
        portionGrams: picked.portionGrams,
        caloriesPer100g: picked.caloriesPer100g,
        proteinPer100g: picked.proteinPer100g,
        carbsPer100g: picked.carbsPer100g,
        fatPer100g: picked.fatPer100g,
      }
    : null;

  return (
    <>
    <Modal visible={!!visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.iconBtnSpacer} />
            <Text style={styles.title}>Quick log a food</Text>
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
              <Text style={styles.label}>Food</Text>
              {previewItem ? (
                <View style={styles.itemRow}>
                  <View style={styles.itemText}>
                    <Text style={styles.itemName} numberOfLines={1}>{previewItem.name}</Text>
                    <Text style={styles.itemMeta}>
                      {Math.round(previewItem.portionGrams)}g · {Math.round(itemKcal(previewItem))} kcal
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.changeBtn, pressed && styles.btnPressed]}
                    onPress={() => setPickerOpen(true)}
                  >
                    <Text style={styles.changeText}>Change</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setPickerOpen(true)}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.glassBtn,
                    styles.pickBtn,
                    pressed && styles.btnPressed,
                    submitting && styles.btnDisabled,
                  ]}
                >
                  <Plus size={18} color={colors.accent} />
                  <Text style={styles.pickText}>Pick a food</Text>
                </Pressable>
              )}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              onPress={handleSave}
              disabled={submitting || !picked}
              style={({ pressed }) => [
                styles.glassBtn,
                styles.saveBtn,
                pressed && styles.btnPressed,
                (submitting || !picked) && styles.btnDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <>
                  <Save size={18} color={colors.accent} />
                  <Text style={styles.saveText}>Log it</Text>
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
      title="Pick a food"
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
    maxHeight: '88%',
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
  changeBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accentMuted,
    borderRadius: radius.md,
  },
  changeText: {
    color: colors.accent,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.semibold,
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
  pickBtn: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent + '33',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
  },
  pickText: {
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
