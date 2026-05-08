import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { Trash2, Plus, Save } from 'lucide-react-native';
import Input from './Input';
import Button from './Button';
import ChipRow from './ChipRow';
import { categoryIcons } from './categoryIcons';
import { colors, spacing, radius, typography } from '../theme';
import { FOOD_CATEGORIES } from '../api/foods';

const CATEGORY_OPTIONS = FOOD_CATEGORIES.map((c) => ({
  value: c,
  label: c.charAt(0).toUpperCase() + c.slice(1),
  Icon: categoryIcons[c],
}));

const MODE_OPTIONS = [
  { value: 'exact', label: 'Enter exact macros' },
  { value: 'search', label: 'Estimate from search' },
];

function toFormState(food, hydrate) {
  const portion = hydrate?.portionSize ?? 100;
  return {
    name: hydrate?.name ?? food?.name ?? '',
    category: food?.category ?? null,
    portionSize: String(portion),
    calories: pickMacro(food?.caloriesPer100g, hydrate?.calories),
    protein: pickMacro(food?.proteinPer100g, hydrate?.protein),
    carbs: pickMacro(food?.carbsPer100g, hydrate?.carbs),
    fat: pickMacro(food?.fatPer100g, hydrate?.fat),
  };
}

function pickMacro(stored, hydrated) {
  if (stored != null) return String(stored);
  if (hydrated != null) return String(hydrated);
  return '';
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function parseAndValidate(form) {
  const name = form.name.trim();
  if (!name) return { error: 'Name is required' };
  if (!form.category) return { error: 'Please pick a category' };

  const portion = Number(form.portionSize);
  if (!Number.isFinite(portion) || portion <= 0) {
    return { error: 'Portion size must be greater than 0' };
  }

  const macroFields = [
    ['calories', 'caloriesPer100g', 'Calories'],
    ['protein', 'proteinPer100g', 'Protein'],
    ['carbs', 'carbsPer100g', 'Carbs'],
    ['fat', 'fatPer100g', 'Fat'],
  ];
  const payload = { name, category: form.category };
  for (const [formKey, payloadKey, label] of macroFields) {
    if (form[formKey] === '' || form[formKey] == null) return { error: `${label} is required` };
    const n = Number(form[formKey]);
    if (!Number.isFinite(n) || n < 0) return { error: `${label} must be 0 or more` };
    payload[payloadKey] = round1((n / portion) * 100);
  }
  return { payload };
}

export default function FoodForm({
  initialFood,
  hydrate,
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
  onSearch,
  submitting = false,
  deleting = false,
}) {
  const [form, setForm] = useState(() => toFormState(initialFood, hydrate));
  const [mode, setMode] = useState('exact');
  const [error, setError] = useState(null);

  // When the parent hands us new hydrate values (e.g. after returning from
  // the USDA search screen), refresh the form fields in place.
  useEffect(() => {
    if (!hydrate) return;
    setForm((f) => ({
      ...f,
      name: hydrate.name ?? f.name,
      portionSize: hydrate.portionSize != null ? String(hydrate.portionSize) : '100',
      calories: hydrate.calories != null ? String(hydrate.calories) : f.calories,
      protein: hydrate.protein != null ? String(hydrate.protein) : f.protein,
      carbs: hydrate.carbs != null ? String(hydrate.carbs) : f.carbs,
      fat: hydrate.fat != null ? String(hydrate.fat) : f.fat,
    }));
    setMode('exact');
  }, [hydrate]);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  function handleModeChange(next) {
    if (next === 'search') {
      if (onSearch) onSearch();
      return;
    }
    setMode(next);
  }

  async function handleSubmit() {
    setError(null);
    const { error: validationError, payload } = parseAndValidate(form);
    if (validationError) {
      setError(validationError);
      return;
    }
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
      <View style={styles.field}>
        <ChipRow
          options={MODE_OPTIONS}
          value={mode}
          onChange={handleModeChange}
          disabled={submitting || deleting || !onSearch}
        />
      </View>

      <Input
        label="Name"
        value={form.name}
        onChangeText={set('name')}
        placeholder="e.g. Chicken breast"
        editable={!submitting && !deleting}
        autoCapitalize="sentences"
      />

      <View style={styles.field}>
        <Text style={styles.label}>Category</Text>
        <ChipRow
          options={CATEGORY_OPTIONS}
          value={form.category}
          onChange={set('category')}
          disabled={submitting || deleting}
        />
      </View>

      <Input
        label="Portion size (g)"
        value={form.portionSize}
        onChangeText={set('portionSize')}
        keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
        editable={!submitting && !deleting}
      />
      <Input
        label="Calories"
        value={form.calories}
        onChangeText={set('calories')}
        keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
        editable={!submitting && !deleting}
      />
      <Input
        label="Protein (g)"
        value={form.protein}
        onChangeText={set('protein')}
        keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
        editable={!submitting && !deleting}
      />
      <Input
        label="Carbs (g)"
        value={form.carbs}
        onChangeText={set('carbs')}
        keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
        editable={!submitting && !deleting}
      />
      <Input
        label="Fat (g)"
        value={form.fat}
        onChangeText={set('fat')}
        keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
        editable={!submitting && !deleting}
      />

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
          accessibilityLabel={submitLabel}
        >
          {submitting ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <>
              {initialFood ? (
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
          accessibilityRole="button"
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
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
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
    gap: spacing.sm,
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
  btnDisabled: {
    opacity: 0.5,
  },
  error: {
    color: colors.danger,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
});
