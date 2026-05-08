import { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { getDailySummary } from '../../api/loggedMeals';
import ScreenBackground from '../../components/ScreenBackground';
import { colors, spacing, radius, typography } from '../../theme';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function ymd(year, month, day) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function monthKey(year, month) {
  return `${year}-${pad2(month + 1)}`;
}

function monthLabel(year, month) {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

// Days the calendar grid needs to render — including leading blanks so the 1st
// lands under its weekday column, and trailing blanks to fill the last row.
function buildMonthGrid(year, month) {
  const first = new Date(Date.UTC(year, month, 1));
  // ISO Monday-first weekday: getUTCDay returns 0=Sun..6=Sat. We want
  // 0=Mon..6=Sun, so shift Sunday from 0 to 6.
  const firstWeekday = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function startOfTodayLocal() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

// Any logged meal earns a green dot — no calorie banding in the UI.
function dotColorFor(summary) {
  if (!summary || summary.mealCount === 0) return null;
  return colors.success;
}

export default function History() {
  const router = useRouter();

  const today = useMemo(() => startOfTodayLocal(), []);
  const [cursor, setCursor] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });

  // Persist fetched-month payloads for the lifetime of the screen so flipping
  // back and forth doesn't re-fetch. Refs (not state) — we don't need a
  // re-render when the cache is mutated; the active-month state covers that.
  const cacheRef = useRef(new Map()); // monthKey -> Map<dateStr, summary>
  const [activeKey, setActiveKey] = useState(monthKey(cursor.year, cursor.month));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const reqIdRef = useRef(0);

  const loadMonth = useCallback(
    async (year, month, { force = false } = {}) => {
      const key = monthKey(year, month);
      setActiveKey(key);
      if (!force && cacheRef.current.has(key)) {
        return;
      }
      const reqId = ++reqIdRef.current;
      setLoading(true);
      setError(null);
      try {
        const from = ymd(year, month, 1);
        const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        const to = ymd(year, month, last);
        const days = await getDailySummary(from, to);
        if (reqIdRef.current !== reqId) return;
        const byDate = new Map(days.map((d) => [d.date, d]));
        cacheRef.current.set(key, byDate);
      } catch (err) {
        if (reqIdRef.current !== reqId) return;
        setError(err?.response?.data?.error || err.message || 'Could not load');
      } finally {
        if (reqIdRef.current === reqId) setLoading(false);
      }
    },
    []
  );

  // On focus: refresh the visible month so edits made on a day-detail screen
  // surface back here. Cheap because we cap at 31 rows.
  useFocusEffect(
    useCallback(() => {
      loadMonth(cursor.year, cursor.month, { force: true });
    }, [cursor, loadMonth])
  );

  function gotoPrev() {
    setCursor(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    );
  }
  function gotoNext() {
    setCursor(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    );
  }

  const grid = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month),
    [cursor]
  );

  const summaryByDate = cacheRef.current.get(activeKey) || new Map();
  const todayKey = ymd(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <View style={styles.container}>
      <ScreenBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>History</Text>

        <View style={styles.calendarHeader}>
          <Pressable
            onPress={gotoPrev}
            style={({ pressed }) => [styles.navBtn, pressed && styles.btnPressed]}
            accessibilityLabel="Previous month"
            hitSlop={8}
          >
            <ChevronLeft size={20} color={colors.accent} />
          </Pressable>
          <Text style={styles.monthLabel}>
            {monthLabel(cursor.year, cursor.month)}
          </Text>
          <Pressable
            onPress={gotoNext}
            style={({ pressed }) => [styles.navBtn, pressed && styles.btnPressed]}
            accessibilityLabel="Next month"
            hitSlop={8}
          >
            <ChevronRight size={20} color={colors.accent} />
          </Pressable>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map((d) => (
            <Text key={d} style={styles.weekdayLabel}>{d}</Text>
          ))}
        </View>

        {loading && summaryByDate.size === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {grid.map((day, idx) => {
              if (day == null) {
                return <View key={`blank-${idx}`} style={styles.dayCell} />;
              }
              const dateStr = ymd(cursor.year, cursor.month, day);
              const summary = summaryByDate.get(dateStr);
              const dot = dotColorFor(summary);
              const isToday = dateStr === todayKey;
              const cellDate = new Date(cursor.year, cursor.month, day);
              cellDate.setHours(0, 0, 0, 0);
              const isFuture = cellDate.getTime() > today.getTime();
              return (
                <Pressable
                  key={dateStr}
                  onPress={() => router.push(`/history/${dateStr}`)}
                  disabled={isFuture}
                  style={({ pressed }) => [
                    styles.dayCell,
                    styles.dayClickable,
                    isToday && styles.dayCellToday,
                    isFuture && styles.dayCellFuture,
                    pressed && !isFuture && styles.dayCellPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isFuture && styles.dayNumberFuture,
                      isToday && styles.dayNumberToday,
                    ]}
                  >
                    {day}
                  </Text>
                  {dot ? (
                    <View style={[styles.dayDot, { backgroundColor: dot }]} />
                  ) : (
                    <View style={styles.dayDotPlaceholder} />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

      </ScrollView>
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
  heading: {
    color: colors.text,
    fontSize: typography.sizes.h1,
    fontFamily: typography.fontFamily.bold,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accent + '33',
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  monthLabel: {
    color: colors.text,
    fontSize: typography.sizes.h3,
    fontFamily: typography.fontFamily.semibold,
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dayClickable: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radius.md,
  },
  dayCellToday: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  dayCellFuture: {
    opacity: 0.35,
  },
  dayCellPressed: {
    backgroundColor: colors.surface,
  },
  dayNumber: {
    color: colors.text,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  dayNumberToday: {
    color: colors.accent,
    fontFamily: typography.fontFamily.bold,
  },
  dayNumberFuture: {
    color: colors.textDim,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  // Invisible spacer so dotted and undotted day cells share the same vertical
  // layout — without this, days with no meals would shift the day number
  // upward.
  dayDotPlaceholder: {
    width: 6,
    height: 6,
  },
  center: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
});
