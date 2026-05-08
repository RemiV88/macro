import { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useEffect } from 'react';
import {
  listLoggedMeals,
  deleteLoggedMeal,
} from '../../api/loggedMeals';
import MealCard from '../../components/MealCard';
import LogActionSheet from '../../components/LogActionSheet';
import LogTemplateModal from '../../components/LogTemplateModal';
import LogBuildModal from '../../components/LogBuildModal';
import LogSingleFoodModal from '../../components/LogSingleFoodModal';
import LogRecipeModal from '../../components/LogRecipeModal';
import { useConfirm } from '../../components/ConfirmModal';
import ScreenBackground from '../../components/ScreenBackground';
import { useAuth } from '../../context/AuthContext';
import {
  MEAL_SLOTS,
  slotLabel,
  computeDayTotals,
  normalizeLoggedItem,
} from '../../utils/macros';
import { colors, spacing, radius, typography } from '../../theme';

function reportError(msg) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(msg);
  } else {
    Alert.alert('Error', msg);
  }
}

// Treat the path param as a local YYYY-MM-DD; format it for human readers.
function formatDate(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr || '';
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  // Construct in local time to avoid Sun-being-Sat issues for far-back dates.
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function DayDetail() {
  const { date } = useLocalSearchParams();
  const dateStr = Array.isArray(date) ? date[0] : date;
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { ask: askConfirm, modal: confirmModal } = useConfirm();

  const [loggedMeals, setLoggedMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [buildModalOpen, setBuildModalOpen] = useState(false);
  const [singleModalOpen, setSingleModalOpen] = useState(false);
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [pendingSlot, setPendingSlot] = useState(null);

  // Set the screen title to the formatted date once we have it.
  useEffect(() => {
    navigation.setOptions?.({ title: formatDate(dateStr) });
  }, [navigation, dateStr]);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const data = await listLoggedMeals(dateStr);
        setLoggedMeals(data);
      } catch (err) {
        setError(err?.response?.data?.error || err.message || 'Could not load');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [dateStr]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load({ silent: true });
  }, [load]);

  function openActionSheet(slot) {
    setPendingSlot(slot || null);
    setActionSheetOpen(true);
  }

  function handleChoose(kind) {
    setActionSheetOpen(false);
    if (kind === 'template') setTemplateModalOpen(true);
    else if (kind === 'build') setBuildModalOpen(true);
    else if (kind === 'recipe') setRecipeModalOpen(true);
    else if (kind === 'single') setSingleModalOpen(true);
  }

  function afterLogged() {
    setTemplateModalOpen(false);
    setBuildModalOpen(false);
    setSingleModalOpen(false);
    setRecipeModalOpen(false);
    setPendingSlot(null);
    load({ silent: true });
  }

  const handleDelete = useCallback(
    async (meal) => {
      const ok = await askConfirm({
        title: 'Delete logged meal',
        message: "Are you sure you want to delete this logged meal? This can't be undone.",
      });
      if (!ok) return;
      try {
        await deleteLoggedMeal(meal._id);
        load({ silent: true });
      } catch (err) {
        reportError(err?.response?.data?.error || err.message || 'Could not delete');
      }
    },
    [askConfirm, load]
  );

  const totals = computeDayTotals(loggedMeals);
  const target = user?.dailyCalorieTarget || 0;
  const proteinTarget = user?.proteinTarget || 0;
  const carbsTarget = user?.carbsTarget || 0;
  const fatTarget = user?.fatTarget || 0;
  const progress = target > 0 ? Math.min(1, totals.kcal / target) : 0;

  const grouped = MEAL_SLOTS.reduce((acc, slot) => {
    acc[slot] = loggedMeals.filter((m) => m.mealSlot === slot);
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <ScreenBackground />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <View style={styles.totalsCard}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsKcal}>{Math.round(totals.kcal).toLocaleString()}</Text>
            <Text style={styles.totalsTarget}>
              / {target ? target.toLocaleString() : '—'} kcal
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.macroStats}>
            <MacroStat label="Protein" current={totals.protein} target={proteinTarget} />
            <MacroStat label="Carbs" current={totals.carbs} target={carbsTarget} />
            <MacroStat label="Fat" current={totals.fat} target={fatTarget} />
          </View>
        </View>

        <Pressable
          onPress={() => openActionSheet(null)}
          style={({ pressed }) => [
            styles.glassBtn,
            styles.logBtn,
            pressed && styles.btnPressed,
          ]}
        >
          <Plus size={18} color={colors.accent} />
          <Text style={styles.logBtnText}>Log meal to this day</Text>
        </Pressable>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => load()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          MEAL_SLOTS.map((slot) => (
            <SlotSection
              key={slot}
              slot={slot}
              meals={grouped[slot]}
              onAdd={() => openActionSheet(slot)}
              onMealPress={(m) => router.push(`/logged-meals/${m._id}/edit`)}
              onMealEdit={(m) => router.push(`/logged-meals/${m._id}/edit`)}
              onMealDelete={handleDelete}
            />
          ))
        )}
      </ScrollView>

      <LogActionSheet
        visible={actionSheetOpen}
        onClose={() => setActionSheetOpen(false)}
        onChoose={handleChoose}
      />
      <LogTemplateModal
        visible={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        onLogged={afterLogged}
        defaultSlot={pendingSlot}
        date={dateStr}
      />
      <LogBuildModal
        visible={buildModalOpen}
        onClose={() => setBuildModalOpen(false)}
        onLogged={afterLogged}
        defaultSlot={pendingSlot || 'lunch'}
        date={dateStr}
      />
      <LogSingleFoodModal
        visible={singleModalOpen}
        onClose={() => setSingleModalOpen(false)}
        onLogged={afterLogged}
        date={dateStr}
      />
      <LogRecipeModal
        visible={recipeModalOpen}
        onClose={() => setRecipeModalOpen(false)}
        onLogged={afterLogged}
        date={dateStr}
      />
      {confirmModal}
    </View>
  );
}

function MacroStat({ label, current, target }) {
  return (
    <View style={styles.macroStat}>
      <Text style={styles.macroValue}>
        {Math.round(current)}
        <Text style={styles.macroUnit}>g</Text>
      </Text>
      <Text style={styles.macroLabel}>
        {label} {target ? `/ ${Math.round(target)}g` : ''}
      </Text>
    </View>
  );
}

function SlotSection({ slot, meals, onAdd, onMealPress, onMealEdit, onMealDelete }) {
  return (
    <View style={styles.slotBlock}>
      <View style={styles.slotHeader}>
        <Text style={styles.slotHeading}>{slotLabel(slot)}</Text>
      </View>
      {meals.length === 0 ? (
        <Pressable
          onPress={onAdd}
          style={({ pressed }) => [styles.addToSlot, pressed && styles.addToSlotPressed]}
        >
          <Plus size={14} color={colors.textMuted} />
          <Text style={styles.addToSlotText}>Add to {slotLabel(slot)}</Text>
        </Pressable>
      ) : (
        <View style={styles.slotMeals}>
          {meals.map((m) => {
            const items = (m.items || []).map(normalizeLoggedItem);
            return (
              <MealCard
                key={m._id}
                name={null}
                mealSlot={m.mealSlot}
                items={items}
                showSlotLabel={false}
                onPress={() => onMealPress(m)}
                onEdit={() => onMealEdit(m)}
                onDelete={() => onMealDelete(m)}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  totalsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  totalsKcal: {
    color: colors.accent,
    fontSize: typography.sizes.display,
    fontFamily: typography.fontFamily.bold,
  },
  totalsTarget: {
    color: colors.textMuted,
    fontSize: typography.sizes.bodyLg,
    fontFamily: typography.fontFamily.medium,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
  },
  macroStats: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.xs,
  },
  macroStat: { gap: 2 },
  macroValue: {
    color: colors.text,
    fontSize: typography.sizes.h3,
    fontFamily: typography.fontFamily.bold,
  },
  macroUnit: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  macroLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
  },
  glassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 12px rgba(0, 148, 232, 0.12)',
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
  logBtn: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent + '33',
  },
  logBtnText: {
    color: colors.accent,
    fontSize: typography.sizes.bodyLg,
    fontFamily: typography.fontFamily.semibold,
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  center: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
  },
  retryBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: {
    color: colors.text,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  slotBlock: { gap: spacing.sm },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotHeading: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  addToSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  addToSlotPressed: {
    opacity: 0.7,
  },
  addToSlotText: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  slotMeals: {
    gap: spacing.md,
  },
});
