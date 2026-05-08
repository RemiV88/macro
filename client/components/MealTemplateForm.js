import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { Trash2, Plus, Save, X, ChefHat } from 'lucide-react-native';
import Input from './Input';
import Button from './Button';
import ChipRow from './ChipRow';
import FoodPickerModal from './FoodPickerModal';
import RecipePickerModal from './RecipePickerModal';
import { itemKcal, MEAL_SLOTS, slotLabel, normalizeTemplateItem } from '../utils/macros';
import { colors, spacing, radius, typography } from '../theme';

const SLOT_OPTIONS = MEAL_SLOTS.map((s) => ({ value: s, label: slotLabel(s) }));

export default function MealTemplateForm({
  initialTemplate,
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
  submitting = false,
  deleting = false,
}) {
  const [name, setName] = useState(initialTemplate?.name || '');
  const [mealSlot, setMealSlot] = useState(initialTemplate?.mealSlot || 'breakfast');
  const [items, setItems] = useState(() =>
    (initialTemplate?.items || []).map(normalizeTemplateItem)
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recipePickerOpen, setRecipePickerOpen] = useState(false);
  const [error, setError] = useState(null);

  // Picker now delivers a full inline item; we just need to map foodName→name
  // for the in-form display and keep everything else as-is.
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

  async function handleSubmit() {
    setError(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (items.length === 0) {
      setError('Add at least one food');
      return;
    }
    const payload = {
      name: name.trim(),
      mealSlot,
      items: items.map((it) => ({
        foodId: it.foodId || null,
        foodName: it.name,
        portionGrams: it.portionGrams,
        caloriesPer100g: it.caloriesPer100g,
        proteinPer100g: it.proteinPer100g,
        carbsPer100g: it.carbsPer100g,
        fatPer100g: it.fatPer100g,
      })),
    };
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not save');
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Input
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. My usual breakfast"
        editable={!submitting && !deleting}
      />

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
        <Text style={styles.label}>Foods</Text>
        {items.length === 0 ? (
          <Text style={styles.emptyText}>No foods yet — add some below.</Text>
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
                  accessibilityLabel={`Remove ${it.name}`}
                  hitSlop={8}
                >
                  <X size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={styles.addRow}>
          <Pressable
            onPress={() => setPickerOpen(true)}
            disabled={submitting || deleting}
            style={({ pressed }) => [
              styles.glassBtn,
              styles.addFoodBtn,
              pressed && styles.btnPressed,
              (submitting || deleting) && styles.btnDisabled,
            ]}
            accessibilityRole="button"
          >
            <Plus size={18} color={colors.accent} />
            <Text style={styles.addFoodBtnText}>Add food</Text>
          </Pressable>
          <Pressable
            onPress={() => setRecipePickerOpen(true)}
            disabled={submitting || deleting}
            style={({ pressed }) => [
              styles.glassBtn,
              styles.addFoodBtn,
              pressed && styles.btnPressed,
              (submitting || deleting) && styles.btnDisabled,
            ]}
            accessibilityRole="button"
          >
            <ChefHat size={18} color={colors.accent} />
            <Text style={styles.addFoodBtnText}>Add recipe</Text>
          </Pressable>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actionsRow}>
        <Pressable
          onPress={handleSubmit}
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
              {initialTemplate ? (
                <Save size={18} color={colors.accent} />
              ) : (
                <Plus size={18} color={colors.accent} />
              )}
              <Text style={styles.submitText}>{submitLabel}</Text>
            </>
          )}
        </Pressable>
        <Pressable
          onPress={onCancel}
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

      {onDelete ? (
        <Button
          icon={<Trash2 size={20} color={colors.danger} />}
          variant="danger"
          onPress={onDelete}
          loading={deleting}
          disabled={submitting}
        />
      ) : null}

      <FoodPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handlePick}
        title="Add food to meal"
        allowQuickAdd
      />

      <RecipePickerModal
        visible={recipePickerOpen}
        onClose={() => setRecipePickerOpen(false)}
        onPick={handlePick}
        title="Add recipe to meal"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  field: { gap: spacing.sm },
  label: {
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  emptyText: {
    color: colors.textDim,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.regular,
    fontStyle: 'italic',
  },
  itemList: {
    gap: spacing.sm,
  },
  addRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
  itemText: {
    flex: 1,
    gap: 2,
  },
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
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
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
  addFoodBtn: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent + '33',
    paddingHorizontal: spacing.lg,
    alignSelf: 'flex-start',
  },
  addFoodBtnText: {
    color: colors.accent,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
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
