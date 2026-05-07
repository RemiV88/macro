import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Modal,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Svg, { Circle, Path, Line, Rect, G } from 'react-native-svg';
import { Plus, MoreVertical } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import {
  listWeightLogs,
  createWeightLog,
  deleteWeightLog,
} from '../../api/weightLogs';
import { useConfirm } from '../../components/ConfirmModal';
import { localDateString } from '../../api/loggedMeals';
import { colors, spacing, radius, typography } from '../../theme';

const ROLLING_WINDOW = 7;
const MIN_ENTRIES_FOR_TREND = 7;

// Server dates are stored at UTC midnight (calendar-date labels, not true
// timestamps). Read UTC components so the displayed/compared day matches the
// label that was logged regardless of viewer timezone.
function utcDateString(d) {
  const date = new Date(d);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// Adaptive rolling average — window grows from 1 up to ROLLING_WINDOW so the
// line spans every entry from day 1. Early points are noisier (small window)
// but the placeholder treatment behind the line acknowledges that.
function computeRollingAverage(entries) {
  const out = [];
  for (let i = 0; i < entries.length; i++) {
    const windowSize = Math.min(i + 1, ROLLING_WINDOW);
    let sum = 0;
    for (let j = i - (windowSize - 1); j <= i; j++) sum += entries[j].weightKg;
    out.push({ date: entries[i].date, avg: sum / windowSize });
  }
  return out;
}

function progressInfo({ goal, startingWeightKg, targetWeightKg, currentWeightKg }) {
  if (goal !== 'lose' && goal !== 'gain') return null;
  if (
    startingWeightKg == null ||
    targetWeightKg == null ||
    currentWeightKg == null ||
    startingWeightKg === targetWeightKg
  ) {
    return null;
  }
  const totalDelta = Math.abs(targetWeightKg - startingWeightKg);
  const progressed =
    goal === 'lose'
      ? startingWeightKg - currentWeightKg
      : currentWeightKg - startingWeightKg;
  const fraction = Math.max(0, Math.min(1, progressed / totalDelta));

  const remaining =
    goal === 'lose' ? currentWeightKg - targetWeightKg : targetWeightKg - currentWeightKg;
  const past = remaining < 0;
  const magnitude = Math.abs(remaining);
  const caption = past
    ? `${magnitude.toFixed(1)}kg over goal`
    : `${magnitude.toFixed(1)}kg to go`;

  return { fraction, caption };
}

function WeightChart({ entries, width, height = 180 }) {
  const padX = 28;
  const padY = 20;

  const chartW = Math.max(0, width - padX * 2);
  const chartH = Math.max(0, height - padY * 2);

  // Real line is drawn whenever we have at least one entry. Placeholder is
  // shown until we hit the full rolling window — the early line is noisy by
  // construction (small window) so the faded zigzag behind helps frame it.
  const hasDots = entries.length > 0;
  const showTrend = hasDots;
  const showPlaceholder = entries.length < MIN_ENTRIES_FOR_TREND;

  // Compute axis scaling only when we have dots to plot. The blurred
  // placeholder is drawn purely in chart-pixel space, so it doesn't depend
  // on entry data and renders identically at 0 entries.
  let xPos = null;
  let yPos = null;
  if (hasDots) {
    const xs = entries.map((e) => new Date(e.date).getTime());
    const ys = entries.map((e) => e.weightKg);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys) - 0.5;
    const maxY = Math.max(...ys) + 0.5;
    const xRange = Math.max(1, maxX - minX);
    const yRange = Math.max(0.1, maxY - minY);
    xPos = (t) => padX + ((t - minX) / xRange) * chartW;
    yPos = (v) => padY + (1 - (v - minY) / yRange) * chartH;
  }

  const trend = showTrend ? computeRollingAverage(entries) : [];
  const trendPath = trend
    .map((p, i) => {
      const x = xPos(new Date(p.date).getTime());
      const y = yPos(p.avg);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  // A zigzagging downward polyline that mimics real weight-loss data:
  // peaks/troughs alternate, but each successive peak and trough sit lower
  // than the last. Drawn in chart-pixel space so it doesn't depend on data.
  // Y values are fractions of chartH (higher fraction = visually lower).
  const placeholderYs = [0.2, 0.35, 0.28, 0.45, 0.4, 0.58, 0.52, 0.7];
  const placeholderPath = showPlaceholder
    ? placeholderYs
        .map((fy, i) => {
          const x = padX + (i / (placeholderYs.length - 1)) * chartW;
          const y = padY + fy * chartH;
          return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(' ')
    : null;

  // Frame (axis box + gridlines) is drawn faded in placeholder mode so the
  // whole chart reads like it's behind frosted glass. Dots, when present,
  // stay outside this group so user data renders crisp.
  const frameOpacity = showPlaceholder ? 0.35 : 1;

  return (
    <Svg width={width} height={height}>
      <G opacity={frameOpacity}>
        <Rect
          x={padX}
          y={padY}
          width={chartW}
          height={chartH}
          fill="transparent"
          stroke={colors.border}
          strokeWidth={1}
        />
        {[0.25, 0.5, 0.75].map((f) => (
          <Line
            key={f}
            x1={padX}
            x2={padX + chartW}
            y1={padY + chartH * f}
            y2={padY + chartH * f}
            stroke={colors.border}
            strokeWidth={1}
            strokeDasharray="3,4"
            opacity={0.6}
          />
        ))}
      </G>
      {placeholderPath ? (
        <Path
          d={placeholderPath}
          stroke={colors.accent}
          strokeWidth={1.75}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.18}
        />
      ) : null}
      {showTrend ? (
        <Path
          d={trendPath}
          stroke={colors.accent}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {hasDots
        ? entries.map((e, i) => (
            <Circle
              key={e._id || i}
              cx={xPos(new Date(e.date).getTime())}
              cy={yPos(e.weightKg)}
              r={3}
              fill={colors.textMuted}
            />
          ))
        : null}
    </Svg>
  );
}

function LogModal({ visible, onClose, onSubmit, initialDate, initialWeight }) {
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(initialDate || localDateString());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible) {
      setWeight(initialWeight != null ? String(initialWeight) : '');
      setDate(initialDate || localDateString());
      setError(null);
      setSubmitting(false);
    }
  }, [visible, initialDate, initialWeight]);

  async function handleSave() {
    setError(null);
    const w = Number(weight);
    if (!Number.isFinite(w) || w <= 0) {
      setError('Enter a weight greater than 0');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Date must be YYYY-MM-DD');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ weightKg: w, date });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not save');
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={submitting ? undefined : onClose}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <Text style={styles.modalTitle}>Log weigh-in</Text>

          <View style={styles.modalField}>
            <Text style={styles.modalLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.modalInput}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              editable={!submitting}
              placeholder="0.0"
              placeholderTextColor={colors.textDim}
              autoFocus
            />
          </View>

          <View style={styles.modalField}>
            <Text style={styles.modalLabel}>Date</Text>
            <TextInput
              style={styles.modalInput}
              value={date}
              onChangeText={setDate}
              editable={!submitting}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textDim}
              autoCapitalize="none"
            />
          </View>

          {error ? <Text style={styles.modalError}>{error}</Text> : null}

          <View style={styles.modalActions}>
            <Pressable
              onPress={onClose}
              disabled={submitting}
              style={({ pressed }) => [
                styles.modalBtn,
                styles.modalBtnGhost,
                pressed && styles.btnPressed,
              ]}
            >
              <Text style={styles.modalBtnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={submitting}
              style={({ pressed }) => [
                styles.modalBtn,
                styles.modalBtnPrimary,
                pressed && styles.btnPressed,
                submitting && styles.btnDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text style={styles.modalBtnPrimaryText}>Save</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function EntryRow({ entry, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowDate}>{formatDate(entry.date)}</Text>
        <Text style={styles.rowWeight}>{entry.weightKg} kg</Text>
      </View>
      <Pressable
        onPress={() => setMenuOpen((v) => !v)}
        style={({ pressed }) => [styles.rowMenuBtn, pressed && styles.btnPressed]}
        accessibilityLabel="Entry menu"
      >
        <MoreVertical size={18} color={colors.textMuted} />
      </Pressable>
      {menuOpen ? (
        <View style={styles.rowMenu}>
          <Pressable
            onPress={() => {
              setMenuOpen(false);
              onDelete(entry);
            }}
            style={({ pressed }) => [styles.rowMenuItem, pressed && styles.btnPressed]}
          >
            <Text style={styles.rowMenuItemDanger}>Delete</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function WeightScreen() {
  const { user, refreshUser } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { ask, modal: confirmEl } = useConfirm();
  const [chartWidth, setChartWidth] = useState(Dimensions.get('window').width - spacing.xl * 2);

  const todayStr = localDateString();
  const todaysEntry = useMemo(
    () => entries.find((e) => utcDateString(e.date) === todayStr),
    [entries, todayStr]
  );

  const load = useCallback(async () => {
    try {
      setError(null);
      const list = await listWeightLogs();
      setEntries(list);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not load');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleSave({ weightKg, date }) {
    await createWeightLog({ weightKg, date });
    await Promise.all([load(), refreshUser()]);
  }

  async function handleDelete(entry) {
    const ok = await ask({
      title: 'Delete entry?',
      message: `Remove the ${entry.weightKg} kg log from ${formatDate(entry.date)}?`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteWeightLog(entry._id);
      await Promise.all([load(), refreshUser()]);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not delete');
    }
  }

  const currentWeight = user?.weightKg;
  const progress = progressInfo({
    goal: user?.goal,
    startingWeightKg: user?.startingWeightKg,
    targetWeightKg: user?.targetWeightKg,
    currentWeightKg: currentWeight,
  });

  // Sort by date ascending for graph; reverse for the list (most recent first).
  const sortedAsc = useMemo(
    () => [...entries].sort((a, b) => new Date(a.date) - new Date(b.date)),
    [entries]
  );
  const sortedDesc = useMemo(() => [...sortedAsc].reverse(), [sortedAsc]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.page}
      onLayout={(e) => {
        // Track the scroll-view width so the chart sizes responsively.
        // Clamp to the container's maxWidth (480) so the chart never overflows
        // the card on wider screens (web).
        const w = Math.min(e.nativeEvent.layout.width, 480);
        setChartWidth(w - spacing.xl * 2);
      }}
    >
      <View style={styles.container}>
        {/* Hero card: current weight + progress */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Current</Text>
          <Text style={styles.heroNumber}>
            {currentWeight != null ? `${currentWeight} kg` : '—'}
          </Text>

          {user?.goal === 'maintain' ? (
            <Text style={styles.maintainText}>Maintaining</Text>
          ) : progress ? (
            <View style={styles.progressBlock}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(progress.fraction * 100).toFixed(1)}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressCaption}>{progress.caption}</Text>
            </View>
          ) : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Graph section — same chart slot regardless of entry count, so the
            layout doesn't shift dramatically once entries are added. */}
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <View style={styles.graphCard}>
            {sortedAsc.length < MIN_ENTRIES_FOR_TREND ? (
              <Text style={styles.graphTitle}>
                Keep logging your weight to unlock your weight trends
              </Text>
            ) : null}
            <WeightChart entries={sortedAsc} width={chartWidth - spacing.lg * 2} />
            <Text style={styles.graphCaption}>
              {`${sortedAsc.length} ${sortedAsc.length === 1 ? 'entry' : 'entries'}`}
            </Text>
          </View>
        )}

        {/* Log button — copy changes for the very first weigh-in. */}
        <Pressable
          onPress={() => setModalOpen(true)}
          style={({ pressed }) => [
            styles.glassBtn,
            styles.primaryBtn,
            pressed && styles.btnPressed,
          ]}
        >
          <Plus size={18} color={colors.accent} />
          <Text style={styles.primaryBtnText}>
            {sortedAsc.length === 0 ? 'Log your first weigh-in' : 'Log weigh-in'}
          </Text>
        </Pressable>

        {/* Entry list */}
        {sortedDesc.length > 0 ? (
          <View style={styles.listCard}>
            <Text style={styles.cardLabel}>History</Text>
            {sortedDesc.map((e, idx) => (
              <View
                key={e._id || idx}
                style={[
                  styles.rowWrap,
                  idx < sortedDesc.length - 1 && styles.rowDivider,
                ]}
              >
                <EntryRow entry={e} onDelete={handleDelete} />
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.tip}>
          Tip: weigh yourself at the same time each day for the most consistent results — ideally first thing in the morning after using the bathroom, before eating.
        </Text>
      </View>

      <LogModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
        initialDate={todayStr}
        initialWeight={todaysEntry?.weightKg}
      />
      {confirmEl}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  page: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 480,
    gap: spacing.lg,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 148, 232, 0.06)',
      },
      default: {
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
    }),
  },
  heroLabel: {
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroNumber: {
    fontSize: typography.sizes.display,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
  },
  maintainText: {
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  progressBlock: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  progressCaption: {
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  error: {
    color: colors.danger,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  loading: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  graphCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  graphTitle: {
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  graphCaption: {
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textAlign: 'center',
  },
  glassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
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
  primaryBtn: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent + '33',
  },
  primaryBtnText: {
    color: colors.accent,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  btnDisabled: { opacity: 0.5 },
  listCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardLabel: {
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  rowWrap: {
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  rowDate: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
  },
  rowWeight: {
    color: colors.text,
    fontSize: typography.sizes.bodyLg,
    fontFamily: typography.fontFamily.semibold,
  },
  rowMenuBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  rowMenu: {
    position: 'absolute',
    right: 0,
    top: 36,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minWidth: 120,
    zIndex: 10,
  },
  rowMenuItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowMenuItemDanger: {
    color: colors.danger,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
  },
  tip: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.regular,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 18,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalTitle: {
    color: colors.text,
    fontSize: typography.sizes.h3,
    fontFamily: typography.fontFamily.bold,
  },
  modalField: { gap: spacing.sm },
  modalLabel: {
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  modalInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: typography.sizes.bodyLg,
    fontFamily: typography.fontFamily.medium,
    color: colors.text,
  },
  modalError: {
    color: colors.danger,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnGhostText: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  modalBtnPrimary: {
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accent + '33',
  },
  modalBtnPrimaryText: {
    color: colors.accent,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
  },
});
