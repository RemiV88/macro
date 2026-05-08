import { useEffect, useMemo, useState } from 'react';
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
import { ChevronLeft, X, Check, Search } from 'lucide-react-native';
import { listMealTemplates } from '../api/mealTemplates';
import { createLoggedMeal, localDateString } from '../api/loggedMeals';
import ChipRow from './ChipRow';
import {
  MEAL_SLOTS,
  slotLabel,
  computeMealTotals,
  normalizeTemplateItem,
} from '../utils/macros';
import { colors, spacing, radius, typography } from '../theme';

const SLOT_OPTIONS = MEAL_SLOTS.map((s) => ({ value: s, label: slotLabel(s) }));
const SLOT_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  ...SLOT_OPTIONS,
];

export default function LogTemplateModal({ visible, onClose, onLogged, defaultSlot, date }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [slot, setSlot] = useState(defaultSlot || 'breakfast');
  const [submitting, setSubmitting] = useState(false);

  // Search + slot filter for the picker step.
  const [query, setQuery] = useState('');
  const [slotFilter, setSlotFilter] = useState('all');

  useEffect(() => {
    if (!visible) {
      setSelected(null);
      setError(null);
      setQuery('');
      setSlotFilter('all');
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await listMealTemplates();
        if (!cancelled) setTemplates(data);
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.error || err.message || 'Could not load');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (slotFilter !== 'all' && t.mealSlot !== slotFilter) return false;
      if (q && !t.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [templates, query, slotFilter]);

  function pick(t) {
    setSelected(t);
    setSlot(t.mealSlot || defaultSlot || 'breakfast');
  }

  async function handleConfirm() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const logged = await createLoggedMeal({
        templateId: selected._id,
        mealSlot: slot,
        date: date || localDateString(),
      });
      onLogged?.(logged);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not log');
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={!!visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            {selected ? (
              <Pressable style={styles.iconBtn} onPress={() => setSelected(null)}>
                <ChevronLeft size={20} color={colors.text} />
              </Pressable>
            ) : (
              <View style={styles.iconBtnSpacer} />
            )}
            <Text style={styles.title} numberOfLines={1}>
              {selected ? selected.name : 'Pick a template'}
            </Text>
            <Pressable style={styles.iconBtn} onPress={onClose}>
              <X size={20} color={colors.text} />
            </Pressable>
          </View>

          {selected ? (
            <SlotConfirm
              template={selected}
              slot={slot}
              onSlotChange={setSlot}
              onConfirm={handleConfirm}
              submitting={submitting}
              error={error}
            />
          ) : (
            <TemplateList
              filtered={filteredTemplates}
              total={templates.length}
              loading={loading}
              error={error}
              query={query}
              onQueryChange={setQuery}
              slotFilter={slotFilter}
              onSlotFilterChange={setSlotFilter}
              onPick={pick}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TemplateList({
  filtered,
  total,
  loading,
  error,
  query,
  onQueryChange,
  slotFilter,
  onSlotFilterChange,
  onPick,
}) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  if (total === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No meal templates yet — create one on the Meals tab.</Text>
      </View>
    );
  }
  return (
    <View style={styles.body}>
      <View style={styles.searchRow}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search saved meals"
          placeholderTextColor={colors.textDim}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <ChipRow
        options={SLOT_FILTER_OPTIONS}
        value={slotFilter}
        onChange={onSlotFilterChange}
      />
      {filtered.length === 0 ? (
        <View style={styles.matchEmpty}>
          <Text style={styles.emptyText}>No matches.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        >
          {filtered.map((t) => {
            const items = (t.items || []).map(normalizeTemplateItem);
            const totals = computeMealTotals(items);
            return (
              <Pressable
                key={t._id}
                onPress={() => onPick(t)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowName} numberOfLines={1}>{t.name}</Text>
                  <Text style={styles.rowMeta}>
                    {slotLabel(t.mealSlot)} · {Math.round(totals.kcal)} kcal · {Math.round(totals.protein)}g protein
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function SlotConfirm({ template, slot, onSlotChange, onConfirm, submitting, error }) {
  const items = (template.items || []).map(normalizeTemplateItem);
  const totals = computeMealTotals(items);
  return (
    <View style={styles.body}>
      <View style={styles.summary}>
        <Text style={styles.summaryKcal}>{Math.round(totals.kcal)} kcal</Text>
        <Text style={styles.summarySub}>
          P {Math.round(totals.protein)}g · C {Math.round(totals.carbs)}g · F {Math.round(totals.fat)}g
        </Text>
        <Text style={styles.summaryItems}>
          {items.length} food{items.length === 1 ? '' : 's'}
        </Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Log to which slot?</Text>
        <ChipRow options={SLOT_OPTIONS} value={slot} onChange={onSlotChange} disabled={submitting} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        onPress={onConfirm}
        disabled={submitting}
        style={({ pressed }) => [
          styles.glassBtn,
          styles.confirmBtn,
          pressed && styles.btnPressed,
          submitting && styles.btnDisabled,
        ]}
      >
        {submitting ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <Check size={18} color={colors.accent} />
            <Text style={styles.confirmText}>Log this meal</Text>
          </>
        )}
      </Pressable>
    </View>
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
    height: '88%',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    overflow: 'hidden',
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
  body: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
    paddingVertical: spacing.md,
  },
  listScroll: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  matchEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent + '55',
  },
  rowText: { flex: 1, gap: 2 },
  rowName: {
    color: colors.text,
    fontSize: typography.sizes.bodyLg,
    fontFamily: typography.fontFamily.semibold,
  },
  rowMeta: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.regular,
  },
  center: {
    flex: 1,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
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
  summaryItems: {
    color: colors.textDim,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.regular,
  },
  field: { gap: spacing.sm },
  label: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  error: {
    color: colors.danger,
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
  confirmBtn: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent + '33',
  },
  confirmText: {
    color: colors.accent,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  btnDisabled: { opacity: 0.5 },
});
