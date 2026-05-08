import { useCallback, useEffect, useRef, useState } from 'react';
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
  Image,
} from 'react-native';
import {
  Search,
  X,
  ChevronLeft,
  Plus,
  Minus,
  Shuffle,
  Clock,
  Users,
} from 'lucide-react-native';
import { searchRecipes, randomRecipe, getRecipe } from '../api/recipes';
import { colors, spacing, radius, typography } from '../theme';

const CUISINE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'italian', label: 'Italian' },
  { value: 'asian', label: 'Asian' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'american', label: 'American' },
  { value: 'indian', label: 'Indian' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'main course', label: 'Main course' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'snack', label: 'Snack' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'salad', label: 'Salad' },
  { value: 'soup', label: 'Soup' },
];

const DIET_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten free', label: 'Gluten-free' },
  { value: 'ketogenic', label: 'Keto' },
  { value: 'pescetarian', label: 'Pescatarian' },
];

export default function RecipePickerModal({
  visible,
  onClose,
  onPick,
  title = 'Find a recipe',
}) {
  const [query, setQuery] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [type, setType] = useState('');
  const [diet, setDiet] = useState('');

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const reqIdRef = useRef(0);

  // Detail panel state
  const [selected, setSelected] = useState(null); // search result summary
  const [detail, setDetail] = useState(null);     // full detail (or null while loading)
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [servingsInput, setServingsInput] = useState('1');
  const [addError, setAddError] = useState(null);

  // Reset everything on close.
  useEffect(() => {
    if (visible) return;
    setQuery('');
    setCuisine('');
    setType('');
    setDiet('');
    setResults([]);
    setHasSearched(false);
    setError(null);
    setLoading(false);
    setSelected(null);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(false);
    setServingsInput('1');
    setAddError(null);
  }, [visible]);

  // Manual search — fires only on Search button press or input submit.
  // Filter chip changes do NOT auto-search (saves Spoonacular quota).
  const runSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed && !cuisine && !type && !diet) {
      // Nothing to search by; just surface the hint state.
      setResults([]);
      setError(null);
      setHasSearched(false);
      return;
    }

    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const recipes = await searchRecipes({
        q: trimmed,
        cuisine,
        type,
        diet,
      });
      if (reqIdRef.current !== reqId) return;
      setResults(recipes);
      setHasSearched(true);
    } catch (err) {
      if (reqIdRef.current !== reqId) return;
      setError(err?.response?.data?.error || err.message || 'Search failed');
      setResults([]);
      setHasSearched(true);
    } finally {
      if (reqIdRef.current === reqId) setLoading(false);
    }
  }, [query, cuisine, type, diet]);

  async function handleRandom() {
    setError(null);
    setLoading(true);
    setHasSearched(true);
    try {
      // Tags pull from current filter selections so "random" feels related to
      // what the user is browsing.
      const tags = [cuisine, type, diet].filter(Boolean);
      const recipe = await randomRecipe(tags);
      // Surface as a single-item result list so the user can tap to expand.
      setResults(recipe ? [recipe] : []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not load random recipe');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function selectRecipe(recipe) {
    setSelected(recipe);
    setDetail(null);
    setDetailError(null);
    setAddError(null);
    setServingsInput('1');
    setDetailLoading(true);
    try {
      const full = await getRecipe(recipe.id);
      setDetail(full);
    } catch (err) {
      setDetailError(err?.response?.data?.error || err.message || 'Could not load recipe');
    } finally {
      setDetailLoading(false);
    }
  }

  function backToList() {
    setSelected(null);
    setDetail(null);
    setDetailError(null);
    setAddError(null);
  }

  function adjustServings(delta) {
    const n = Number(servingsInput);
    const next = (Number.isFinite(n) ? n : 0) + delta;
    if (next < 0) return;
    setServingsInput(String(Math.round(next * 100) / 100));
  }

  function handleAdd() {
    setAddError(null);
    const source = detail || selected;
    if (!source) return;

    const multiplier = Number(servingsInput);
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      setAddError('Servings must be greater than 0');
      return;
    }

    const perServingKcal = source.calories || 0;
    const perServingProtein = source.protein || 0;
    const perServingCarbs = source.carbs || 0;
    const perServingFat = source.fat || 0;

    const totalKcal = perServingKcal * multiplier;
    const totalProtein = perServingProtein * multiplier;
    const totalCarbs = perServingCarbs * multiplier;
    const totalFat = perServingFat * multiplier;

    // Recipes are per-serving, not per-100g — so we shoehorn the recipe into
    // the inline meal-item shape by treating the *total* macros as if they
    // were the per-100g values, and setting portionGrams to 100. Downstream
    // math (portionGrams / 100 * caloriesPer100g) then yields the correct
    // total. Without this trick the meal totals would be wrong.
    onPick?.({
      foodId: null,
      foodName: source.title,
      portionGrams: 100,
      caloriesPer100g: totalKcal,
      proteinPer100g: totalProtein,
      carbsPer100g: totalCarbs,
      fatPer100g: totalFat,
    });

    onClose?.();
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
                {selected ? selected.title : title}
              </Text>
              <Pressable style={styles.iconBtn} onPress={onClose} accessibilityLabel="Close">
                <X size={20} color={colors.text} />
              </Pressable>
            </View>

            {selected ? (
              <RecipeDetailPanel
                summary={selected}
                detail={detail}
                loading={detailLoading}
                error={detailError}
                servingsInput={servingsInput}
                onServingsChange={setServingsInput}
                onStep={adjustServings}
                onAdd={handleAdd}
                addError={addError}
                onBack={backToList}
              />
            ) : (
              <RecipeBrowse
                query={query}
                onQueryChange={setQuery}
                cuisine={cuisine}
                onCuisineChange={setCuisine}
                type={type}
                onTypeChange={setType}
                diet={diet}
                onDietChange={setDiet}
                onSearch={runSearch}
                onRandom={handleRandom}
                results={results}
                loading={loading}
                error={error}
                hasSearched={hasSearched}
                onSelect={selectRecipe}
              />
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function RecipeBrowse({
  query,
  onQueryChange,
  cuisine,
  onCuisineChange,
  type,
  onTypeChange,
  diet,
  onDietChange,
  onSearch,
  onRandom,
  results,
  loading,
  error,
  hasSearched,
  onSelect,
}) {
  return (
    <View style={styles.body}>
      <View style={styles.searchControls}>
        <View style={[styles.searchRow, styles.searchRowInline]}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            onSubmitEditing={onSearch}
            returnKeyType="search"
            placeholder="Search recipes (e.g. 'sea bass')"
            placeholderTextColor={colors.textDim}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <Pressable
          onPress={onSearch}
          style={({ pressed }) => [
            styles.glassBtn,
            styles.searchBtn,
            pressed && styles.btnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Search"
        >
          <Search size={16} color={colors.accent} />
          <Text style={styles.searchBtnText}>Search</Text>
        </Pressable>
      </View>

      {!hasSearched ? (
        <Text style={styles.searchHint}>Press search to find recipes</Text>
      ) : null}

      <FilterChipRow label="Cuisine" options={CUISINE_OPTIONS} value={cuisine} onChange={onCuisineChange} />
      <FilterChipRow label="Type" options={TYPE_OPTIONS} value={type} onChange={onTypeChange} />
      <FilterChipRow label="Diet" options={DIET_OPTIONS} value={diet} onChange={onDietChange} />

      <Pressable
        onPress={onRandom}
        style={({ pressed }) => [
          styles.glassBtn,
          styles.randomBtn,
          pressed && styles.btnPressed,
        ]}
        accessibilityRole="button"
      >
        <Shuffle size={16} color={colors.accent} />
        <Text style={styles.randomBtnText}>Random recipe</Text>
      </Pressable>

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
            <Text style={styles.emptyText}>
              Type a query (or pick filters), then hit Search. Random recipe also works.
            </Text>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No recipes match those filters.</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <RecipeCard recipe={item} onPress={() => onSelect(item)} />
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

function FilterChipRow({ label, options, value, onChange }) {
  return (
    <View style={styles.filterBlock}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChips}
      >
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <Pressable
              key={opt.value || 'all'}
              onPress={() => onChange(opt.value)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function RecipeCard({ recipe, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      {recipe.image ? (
        <Image source={{ uri: recipe.image }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImageFallback]}>
          <Text style={styles.cardImageFallbackText}>
            {(recipe.title || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.cardText}>
        <Text style={styles.cardTitle} numberOfLines={2}>{recipe.title}</Text>
        <View style={styles.cardMetaRow}>
          {recipe.readyInMinutes != null ? (
            <View style={styles.cardMetaItem}>
              <Clock size={12} color={colors.textMuted} />
              <Text style={styles.cardMeta}>{recipe.readyInMinutes}m</Text>
            </View>
          ) : null}
          {recipe.servings != null ? (
            <View style={styles.cardMetaItem}>
              <Users size={12} color={colors.textMuted} />
              <Text style={styles.cardMeta}>{recipe.servings} serv</Text>
            </View>
          ) : null}
          {recipe.calories != null ? (
            <Text style={styles.cardMeta}>
              {Math.round(recipe.calories)} kcal/serv
            </Text>
          ) : null}
        </View>
        {recipe.protein != null || recipe.carbs != null || recipe.fat != null ? (
          <Text style={styles.cardMacros}>
            P {Math.round(recipe.protein || 0)}g · C {Math.round(recipe.carbs || 0)}g · F {Math.round(recipe.fat || 0)}g
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function RecipeDetailPanel({
  summary,
  detail,
  loading,
  error,
  servingsInput,
  onServingsChange,
  onStep,
  onAdd,
  addError,
}) {
  // Use detail when available, fall back to summary so we can render
  // immediately while the detail call is in flight.
  const recipe = detail || summary;
  const multiplier = Number(servingsInput) || 0;
  const kcal = Math.round((recipe.calories || 0) * multiplier);
  const protein = Math.round((recipe.protein || 0) * multiplier);
  const carbs = Math.round((recipe.carbs || 0) * multiplier);
  const fat = Math.round((recipe.fat || 0) * multiplier);

  return (
    <ScrollView
      style={styles.detailScroll}
      contentContainerStyle={styles.detailContent}
      keyboardShouldPersistTaps="handled"
    >
      {recipe.image ? (
        <Image source={{ uri: recipe.image }} style={styles.detailImage} />
      ) : null}

      <View style={styles.detailMetaRow}>
        {recipe.readyInMinutes != null ? (
          <View style={styles.detailMetaItem}>
            <Clock size={14} color={colors.textMuted} />
            <Text style={styles.detailMeta}>{recipe.readyInMinutes} min</Text>
          </View>
        ) : null}
        {recipe.servings != null ? (
          <View style={styles.detailMetaItem}>
            <Users size={14} color={colors.textMuted} />
            <Text style={styles.detailMeta}>{recipe.servings} servings</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.macroGrid}>
        <MacroTile label="Calories" value={`${Math.round(recipe.calories || 0)}`} unit="kcal" />
        <MacroTile label="Protein" value={`${Math.round(recipe.protein || 0)}`} unit="g" />
        <MacroTile label="Carbs" value={`${Math.round(recipe.carbs || 0)}`} unit="g" />
        <MacroTile label="Fat" value={`${Math.round(recipe.fat || 0)}`} unit="g" />
      </View>
      <Text style={styles.macroGridCaption}>Per serving</Text>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>How many servings did you have?</Text>
        <View style={styles.stepperRow}>
          <Pressable
            style={({ pressed }) => [styles.stepBtn, pressed && styles.btnPressed]}
            onPress={() => onStep(-0.5)}
            accessibilityLabel="Decrease servings"
          >
            <Minus size={18} color={colors.accent} />
          </Pressable>
          <TextInput
            value={servingsInput}
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

      <View style={styles.macroPreview}>
        <Text style={styles.macroPreviewMain}>{kcal} kcal</Text>
        <Text style={styles.macroPreviewSub}>
          P {protein}g · C {carbs}g · F {fat}g · {multiplier} serving{multiplier === 1 ? '' : 's'}
        </Text>
      </View>

      {addError ? <Text style={styles.errorText}>{addError}</Text> : null}

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

      {loading ? (
        <View style={styles.detailLoading}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.detailLoadingText}>Loading details…</Text>
        </View>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : detail ? (
        <>
          {detail.summary ? (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>About</Text>
              <Text style={styles.detailBody}>{detail.summary}</Text>
            </View>
          ) : null}

          {detail.ingredients?.length ? (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Ingredients</Text>
              {detail.ingredients.map((ing, i) => (
                <Text key={i} style={styles.detailBullet}>
                  • {ing.original || `${ing.amount ?? ''} ${ing.unit || ''} ${ing.name}`.trim()}
                </Text>
              ))}
            </View>
          ) : null}

          {detail.instructions ? (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Instructions</Text>
              <Text style={styles.detailBody}>{detail.instructions}</Text>
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

function MacroTile({ label, value, unit }) {
  return (
    <View style={styles.macroTile}>
      <Text style={styles.macroTileLabel}>{label}</Text>
      <Text style={styles.macroTileValue}>{value}<Text style={styles.macroTileUnit}> {unit}</Text></Text>
    </View>
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
    height: '90%',
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
    gap: spacing.md,
  },
  searchControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  searchRowInline: {
    flex: 1,
  },
  searchBtn: {
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent + '33',
  },
  searchBtnText: {
    color: colors.accent,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
  },
  searchHint: {
    color: colors.textDim,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.regular,
    fontStyle: 'italic',
    marginTop: -spacing.xs,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
    paddingVertical: spacing.md,
  },
  filterBlock: {
    gap: spacing.xs,
  },
  filterLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
  },
  filterChips: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.text,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
  },
  chipTextSelected: { color: colors.accent },
  randomBtn: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent + '33',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
  },
  randomBtnText: {
    color: colors.accent,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
  },
  listArea: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  cardPressed: {
    backgroundColor: colors.surface,
  },
  cardImage: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    resizeMode: 'cover',
  },
  cardImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImageFallbackText: {
    color: colors.accent,
    fontSize: typography.sizes.h2,
    fontFamily: typography.fontFamily.bold,
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: colors.text,
    fontSize: typography.sizes.bodyLg,
    fontFamily: typography.fontFamily.semibold,
  },
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  cardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.regular,
  },
  cardMacros: {
    color: colors.textDim,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.regular,
  },
  sep: {
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.5,
    marginVertical: spacing.xs,
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
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  detailScroll: { flex: 1 },
  detailContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  detailImage: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    resizeMode: 'cover',
  },
  detailMetaRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  detailMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailMeta: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  macroTile: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  macroTileLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
  },
  macroTileValue: {
    color: colors.text,
    fontSize: typography.sizes.h3,
    fontFamily: typography.fontFamily.bold,
  },
  macroTileUnit: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
  },
  macroGridCaption: {
    color: colors.textDim,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.regular,
    fontStyle: 'italic',
    marginTop: -spacing.sm,
  },
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
  detailLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailLoadingText: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  detailSection: {
    gap: spacing.sm,
  },
  detailSectionTitle: {
    color: colors.text,
    fontSize: typography.sizes.bodyLg,
    fontFamily: typography.fontFamily.semibold,
  },
  detailBody: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 20,
  },
  detailBullet: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 20,
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
});
