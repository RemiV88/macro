import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Search, X, ChevronLeft, Plus, Minus } from 'lucide-react-native';
import { listFoods } from '../api/foods';
import { searchUsda } from '../api/usda';
import { categoryIcons } from './categoryIcons';
import { colors, spacing, radius, typography } from '../theme';

const MODE_OPTIONS = [
  { value: 'grams', label: 'Grams' },
  { value: 'servings', label: 'Servings' },
];

const TABS = [
  { value: 'library', label: 'My Foods' },
  { value: 'usda', label: 'Search USDA' },
  { value: 'manual', label: 'Manual entry' },
];

const EMPTY_MANUAL = {
  name: '',
  caloriesPer100g: '',
  proteinPer100g: '0',
  carbsPer100g: '0',
  fatPer100g: '0',
  portionGrams: '100',
};

const USDA_DEBOUNCE_MS = 400;

function normalizeLibrary(food) {
  return {
    source: 'library',
    key: `lib-${food._id}`,
    _id: food._id,
    name: food.name,
    category: food.category,
    caloriesPer100g: food.caloriesPer100g,
    proteinPer100g: food.proteinPer100g,
    carbsPer100g: food.carbsPer100g,
    fatPer100g: food.fatPer100g,
  };
}

function normalizeUsda(food) {
  return {
    source: 'usda',
    key: `usda-${food.fdcId}`,
    fdcId: food.fdcId,
    name: food.name,
    caloriesPer100g: food.calories,
    proteinPer100g: food.protein,
    carbsPer100g: food.carbs,
    fatPer100g: food.fat,
  };
}

export default function FoodPickerModal({
  visible,
  onClose,
  onPick,
  allowQuickAdd = false,
  title = 'Add food',
}) {
  const [tab, setTab] = useState('library');

  // Library state
  const [libraryFoods, setLibraryFoods] = useState([]);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState(null);

  // USDA state
  const [usdaQuery, setUsdaQuery] = useState('');
  const [usdaResults, setUsdaResults] = useState([]);
  const [usdaLoading, setUsdaLoading] = useState(false);
  const [usdaError, setUsdaError] = useState(null);
  const [usdaHasSearched, setUsdaHasSearched] = useState(false);
  const usdaReqIdRef = useRef(0);

  // Shared selection / portion state
  const [selected, setSelected] = useState(null); // normalized food or null
  const [mode, setMode] = useState('grams');
  const [grams, setGrams] = useState('100');
  const [servings, setServings] = useState('1');
  const [addError, setAddError] = useState(null);

  // Manual-entry state — independent of library/USDA so switching tabs doesn't
  // bleed inputs. Numbers are kept as strings while editing so the input can
  // hold partial values (e.g. "0." mid-typing).
  const [manual, setManual] = useState(EMPTY_MANUAL);
  const [manualError, setManualError] = useState(null);

  // Reload the user's library each time the modal opens — fresh data after
  // adds on the Foods tab.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLibraryLoading(true);
    setLibraryError(null);
    (async () => {
      try {
        const data = await listFoods();
        if (!cancelled) setLibraryFoods(data);
      } catch (err) {
        if (!cancelled) {
          setLibraryError(err?.response?.data?.error || err.message || 'Could not load foods');
        }
      } finally {
        if (!cancelled) setLibraryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  // Reset everything when the modal closes.
  useEffect(() => {
    if (visible) return;
    setTab('library');
    setLibraryQuery('');
    setUsdaQuery('');
    setUsdaResults([]);
    setUsdaHasSearched(false);
    setUsdaError(null);
    setSelected(null);
    setMode('grams');
    setGrams('100');
    setServings('1');
    setAddError(null);
    setManual(EMPTY_MANUAL);
    setManualError(null);
  }, [visible]);

  // Debounced USDA search.
  useEffect(() => {
    if (!visible) return;
    const trimmed = usdaQuery.trim();
    if (!trimmed) {
      setUsdaResults([]);
      setUsdaError(null);
      setUsdaLoading(false);
      setUsdaHasSearched(false);
      return;
    }
    const reqId = ++usdaReqIdRef.current;
    setUsdaLoading(true);
    setUsdaError(null);

    const t = setTimeout(async () => {
      try {
        const foods = await searchUsda(trimmed);
        if (usdaReqIdRef.current !== reqId) return;
        setUsdaResults(foods);
        setUsdaHasSearched(true);
      } catch (err) {
        if (usdaReqIdRef.current !== reqId) return;
        setUsdaError(err?.response?.data?.error || err.message || 'Search failed');
        setUsdaResults([]);
        setUsdaHasSearched(true);
      } finally {
        if (usdaReqIdRef.current === reqId) setUsdaLoading(false);
      }
    }, USDA_DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [usdaQuery, visible]);

  const filteredLibrary = useMemo(() => {
    const q = libraryQuery.trim().toLowerCase();
    if (!q) return libraryFoods;
    return libraryFoods.filter((f) => f.name.toLowerCase().includes(q));
  }, [libraryFoods, libraryQuery]);

  function selectFood(normalized) {
    setSelected(normalized);
    setAddError(null);
    // Don't reset mode/grams/servings — spec says portion preference persists.
  }

  function backToList() {
    setSelected(null);
    setAddError(null);
  }

  function adjustServings(delta) {
    const n = Number(servings);
    const next = (Number.isFinite(n) ? n : 0) + delta;
    if (next < 0) return;
    setServings(String(Math.round(next * 100) / 100));
  }

  function handleManualAdd() {
    setManualError(null);
    const name = (manual.name || '').trim();
    if (!name) {
      setManualError('Name is required');
      return;
    }
    const numeric = {
      caloriesPer100g: Number(manual.caloriesPer100g),
      proteinPer100g: Number(manual.proteinPer100g),
      carbsPer100g: Number(manual.carbsPer100g),
      fatPer100g: Number(manual.fatPer100g),
      portionGrams: Number(manual.portionGrams),
    };
    for (const [key, val] of Object.entries(numeric)) {
      if (!Number.isFinite(val) || val < 0) {
        setManualError(`${key === 'portionGrams' ? 'Portion' : key.replace('Per100g', '')} must be 0 or more`);
        return;
      }
    }
    if (numeric.portionGrams <= 0) {
      setManualError('Portion must be greater than 0');
      return;
    }

    // Same inline-item shape as USDA picks. foodId=null → not saved to the
    // user's library, one-off only.
    onPick?.({
      foodId: null,
      foodName: name,
      portionGrams: numeric.portionGrams,
      caloriesPer100g: numeric.caloriesPer100g,
      proteinPer100g: numeric.proteinPer100g,
      carbsPer100g: numeric.carbsPer100g,
      fatPer100g: numeric.fatPer100g,
    });

    if (allowQuickAdd) {
      setManual(EMPTY_MANUAL);
    } else {
      onClose?.();
    }
  }

  function handleAdd() {
    if (!selected) return;
    setAddError(null);

    let portionGrams;
    if (mode === 'servings') {
      const multiplier = Number(servings);
      if (!Number.isFinite(multiplier) || multiplier <= 0) {
        setAddError('Servings must be greater than 0');
        return;
      }
      portionGrams = multiplier * 100;
    } else {
      portionGrams = Number(grams);
      if (!Number.isFinite(portionGrams) || portionGrams <= 0) {
        setAddError('Portion must be greater than 0');
        return;
      }
    }

    // The picker delivers a full inline item to the parent regardless of
    // source. USDA picks have foodId=null; library picks carry the food's _id
    // so the parent can keep that back-link if it's useful later. We do NOT
    // save USDA picks to /api/foods — that would pollute the library.
    onPick?.({
      foodId: selected.source === 'library' ? selected._id : null,
      foodName: selected.name,
      portionGrams,
      caloriesPer100g: selected.caloriesPer100g,
      proteinPer100g: selected.proteinPer100g,
      carbsPer100g: selected.carbsPer100g,
      fatPer100g: selected.fatPer100g,
    });

    if (allowQuickAdd) {
      setSelected(null);
      // Keep query+tab so user can keep adding similar items.
    } else {
      onClose?.();
    }
  }

  return (
    <Modal
      visible={!!visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.header}>
              {selected ? (
                <Pressable style={styles.iconBtn} onPress={backToList} accessibilityLabel="Back">
                  <ChevronLeft size={20} color={colors.text} />
                </Pressable>
              ) : (
                <View style={styles.iconBtnSpacer} />
              )}
              <Text style={styles.title} numberOfLines={1}>
                {selected ? selected.name : title}
              </Text>
              <Pressable style={styles.iconBtn} onPress={onClose} accessibilityLabel="Close">
                <X size={20} color={colors.text} />
              </Pressable>
            </View>

            {!selected ? (
              <View style={styles.tabBar}>
                {TABS.map((t) => {
                  const active = tab === t.value;
                  return (
                    <Pressable
                      key={t.value}
                      onPress={() => setTab(t.value)}
                      style={[styles.tab, active && styles.tabActive]}
                    >
                      <Text style={[styles.tabText, active && styles.tabTextActive]}>
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {selected ? (
              <PortionEntry
                food={selected}
                mode={mode}
                onModeChange={setMode}
                grams={grams}
                onGramsChange={setGrams}
                servings={servings}
                onServingsChange={setServings}
                onStep={adjustServings}
                onAdd={handleAdd}
                error={addError}
              />
            ) : tab === 'library' ? (
              <LibraryList
                foods={filteredLibrary}
                loading={libraryLoading}
                error={libraryError}
                query={libraryQuery}
                onQueryChange={setLibraryQuery}
                onSelect={(f) => selectFood(normalizeLibrary(f))}
              />
            ) : tab === 'usda' ? (
              <UsdaList
                results={usdaResults}
                loading={usdaLoading}
                error={usdaError}
                hasSearched={usdaHasSearched}
                query={usdaQuery}
                onQueryChange={setUsdaQuery}
                onSelect={(f) => selectFood(normalizeUsda(f))}
              />
            ) : (
              <ManualEntry
                values={manual}
                onChange={setManual}
                onAdd={handleManualAdd}
                error={manualError}
              />
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function LibraryList({ foods, loading, error, query, onQueryChange, onSelect }) {
  return (
    <View style={styles.body}>
      <SearchBar
        value={query}
        onChange={onQueryChange}
        placeholder="Search your foods"
      />
      <View style={styles.listArea}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : foods.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {query ? 'No matches.' : 'No foods yet — try the USDA tab or add some on the Foods tab.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={foods}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <FoodRow
                name={item.name}
                kcal={item.caloriesPer100g}
                protein={item.proteinPer100g}
                category={item.category}
                onPress={() => onSelect(item)}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </View>
  );
}

function UsdaList({ results, loading, error, hasSearched, query, onQueryChange, onSelect }) {
  return (
    <View style={styles.body}>
      <SearchBar
        value={query}
        onChange={onQueryChange}
        placeholder="Search USDA (e.g. chicken breast)"
        autoCorrect={false}
      />
      <View style={styles.listArea}>
        {error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : !hasSearched ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>Type to search USDA</Text>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No results for "{query.trim()}"</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => String(item.fdcId)}
            renderItem={({ item }) => (
              <FoodRow
                name={item.name}
                kcal={item.calories}
                protein={item.protein}
                onPress={() => onSelect(item)}
                fromUsda
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </View>
  );
}

function ManualEntry({ values, onChange, onAdd, error }) {
  function update(key, v) {
    onChange({ ...values, [key]: v });
  }
  const fields = [
    { key: 'name', label: 'Name', placeholder: 'e.g. Test snack', kind: 'text' },
    { key: 'caloriesPer100g', label: 'Calories per 100g', kind: 'number' },
    { key: 'proteinPer100g', label: 'Protein per 100g (g)', kind: 'number' },
    { key: 'carbsPer100g', label: 'Carbs per 100g (g)', kind: 'number' },
    { key: 'fatPer100g', label: 'Fat per 100g (g)', kind: 'number' },
    { key: 'portionGrams', label: 'Portion (g)', kind: 'number' },
  ];
  return (
    <ScrollView
      style={styles.portionScroll}
      contentContainerStyle={styles.portionScrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.usdaHint}>Quick one-off entry — won't be saved to your library.</Text>
      {fields.map((f) => (
        <View key={f.key} style={styles.field}>
          <Text style={styles.fieldLabel}>{f.label}</Text>
          <TextInput
            value={values[f.key]}
            onChangeText={(v) => update(f.key, v)}
            placeholder={f.placeholder}
            placeholderTextColor={colors.textDim}
            keyboardType={
              f.kind === 'number'
                ? Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'
                : 'default'
            }
            autoCapitalize={f.kind === 'number' ? 'none' : 'sentences'}
            autoCorrect={f.kind === 'text'}
            style={styles.fieldInput}
          />
        </View>
      ))}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        onPress={onAdd}
        style={({ pressed }) => [
          styles.glassBtn,
          styles.addBtn,
          pressed && styles.btnPressed,
        ]}
        accessibilityRole="button"
      >
        <Plus size={18} color={colors.accent} />
        <Text style={styles.addBtnText}>Add to meal</Text>
      </Pressable>
    </ScrollView>
  );
}

function SearchBar({ value, onChange, placeholder, autoCorrect = true }) {
  return (
    <View style={styles.searchRow}>
      <Search size={16} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        style={styles.searchInput}
        autoCapitalize="none"
        autoCorrect={autoCorrect}
      />
    </View>
  );
}

function FoodRow({ name, kcal, protein, category, onPress, fromUsda }) {
  const Icon = !fromUsda && category ? categoryIcons[category] : null;
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
      <View style={styles.rowIcon}>
        {Icon ? (
          <Icon size={18} color={colors.accent} />
        ) : (
          <Text style={styles.rowIconLetter}>{(name || '?').charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={2}>{name}</Text>
        <Text style={styles.rowMeta}>
          {Math.round(kcal || 0)} kcal · {Math.round(protein || 0)}g protein · per 100g
        </Text>
      </View>
    </Pressable>
  );
}

function PortionEntry({
  food,
  mode,
  onModeChange,
  grams,
  onGramsChange,
  servings,
  onServingsChange,
  onStep,
  onAdd,
  error,
}) {
  const portionGrams =
    mode === 'servings'
      ? (Number(servings) || 0) * 100
      : Number(grams) || 0;
  const factor = portionGrams / 100;
  const kcal = Math.round((food.caloriesPer100g || 0) * factor);
  const protein = Math.round((food.proteinPer100g || 0) * factor);
  const carbs = Math.round((food.carbsPer100g || 0) * factor);
  const fat = Math.round((food.fatPer100g || 0) * factor);

  return (
    <ScrollView
      style={styles.portionScroll}
      contentContainerStyle={styles.portionScrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {food.source === 'usda' ? (
        <Text style={styles.usdaHint}>From USDA — added inline, not saved to your library.</Text>
      ) : null}

      <View style={styles.modeRow}>
        {MODE_OPTIONS.map((opt) => {
          const selected = mode === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onModeChange(opt.value)}
              style={[styles.modeChip, selected && styles.modeChipSelected]}
            >
              <Text style={[styles.modeChipText, selected && styles.modeChipTextSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {mode === 'grams' ? (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Portion (g)</Text>
          <TextInput
            value={grams}
            onChangeText={onGramsChange}
            keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
            style={styles.fieldInput}
            placeholderTextColor={colors.textDim}
          />
        </View>
      ) : (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Servings (1 = 100g)</Text>
          <View style={styles.stepperRow}>
            <Pressable
              style={({ pressed }) => [styles.stepBtn, pressed && styles.btnPressed]}
              onPress={() => onStep(-0.5)}
              accessibilityLabel="Decrease servings"
            >
              <Minus size={18} color={colors.accent} />
            </Pressable>
            <TextInput
              value={servings}
              onChangeText={onServingsChange}
              keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
              style={[styles.fieldInput, styles.stepperInput]}
              placeholderTextColor={colors.textDim}
            />
            <Pressable
              style={({ pressed }) => [styles.stepBtn, pressed && styles.btnPressed]}
              onPress={() => onStep(0.5)}
              accessibilityLabel="Increase servings"
            >
              <Plus size={18} color={colors.accent} />
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.macroPreview}>
        <Text style={styles.macroPreviewMain}>{kcal} kcal</Text>
        <Text style={styles.macroPreviewSub}>
          P {protein}g · C {carbs}g · F {fat}g · {Math.round(portionGrams)}g portion
        </Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        onPress={onAdd}
        style={({ pressed }) => [
          styles.glassBtn,
          styles.addBtn,
          pressed && styles.btnPressed,
        ]}
        accessibilityRole="button"
      >
        <Plus size={18} color={colors.accent} />
        <Text style={styles.addBtnText}>Add to meal</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  iconBtnSpacer: {
    width: 36,
    height: 36,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  tabActive: {
    borderColor: colors.accent,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  tabTextActive: {
    color: colors.accent,
    fontFamily: typography.fontFamily.semibold,
  },
  body: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  listArea: {
    flex: 1,
    minHeight: 0,
  },
  portionScroll: {
    flex: 1,
  },
  portionScrollContent: {
    padding: spacing.lg,
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
  listContent: {
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  rowPressed: {
    backgroundColor: colors.surface,
  },
  rowIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentMuted,
    borderRadius: radius.md,
  },
  rowIconLetter: {
    color: colors.accent,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.bold,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
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
  sep: {
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.5,
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
  usdaHint: {
    color: colors.textDim,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.regular,
    fontStyle: 'italic',
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeChip: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  modeChipSelected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  modeChipText: {
    color: colors.text,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  modeChipTextSelected: { color: colors.accent },
  field: { gap: spacing.sm },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  fieldInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: typography.sizes.bodyLg,
    fontFamily: typography.fontFamily.medium,
    color: colors.text,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepperInput: {
    flex: 1,
    textAlign: 'center',
  },
  stepBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent + '33',
    backgroundColor: colors.accentMuted,
  },
  macroPreview: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  macroPreviewMain: {
    color: colors.accent,
    fontSize: typography.sizes.h2,
    fontFamily: typography.fontFamily.bold,
  },
  macroPreviewSub: {
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
  },
  addBtnText: {
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
