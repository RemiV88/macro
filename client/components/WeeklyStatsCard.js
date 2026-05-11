import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MACRO_COLORS } from './MacroDonut';
import { colors, spacing, radius, typography } from '../theme';

function MetricRow({ label, value, sub, valueColor }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValueWrap}>
        <Text style={[styles.rowValue, valueColor && { color: valueColor }]}>{value}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function MacroSplitBar({ macroAvg }) {
  const protein = Math.max(0, Number(macroAvg?.protein) || 0);
  const carbs = Math.max(0, Number(macroAvg?.carbs) || 0);
  const fat = Math.max(0, Number(macroAvg?.fat) || 0);
  const total = protein + carbs + fat;
  const isEmpty = total <= 0;

  // Re-derive segment widths from the rounded server values so the bar matches
  // the legend exactly. If everything rounded to zero, fall back to a flat
  // grey track.
  return (
    <View style={styles.macroBlock}>
      <Text style={styles.rowLabel}>Macro split</Text>
      <View style={styles.bar}>
        {isEmpty ? (
          <View style={[styles.barSegment, { flex: 1, backgroundColor: colors.border }]} />
        ) : (
          <>
            {protein > 0 ? (
              <View
                style={[
                  styles.barSegment,
                  { flex: protein, backgroundColor: MACRO_COLORS.protein },
                ]}
              />
            ) : null}
            {carbs > 0 ? (
              <View
                style={[
                  styles.barSegment,
                  { flex: carbs, backgroundColor: MACRO_COLORS.carbs },
                ]}
              />
            ) : null}
            {fat > 0 ? (
              <View
                style={[
                  styles.barSegment,
                  { flex: fat, backgroundColor: MACRO_COLORS.fat },
                ]}
              />
            ) : null}
          </>
        )}
      </View>
      <View style={styles.legendRow}>
        <LegendChip color={MACRO_COLORS.protein} label="Protein" pct={protein} empty={isEmpty} />
        <LegendChip color={MACRO_COLORS.carbs} label="Carbs" pct={carbs} empty={isEmpty} />
        <LegendChip color={MACRO_COLORS.fat} label="Fat" pct={fat} empty={isEmpty} />
      </View>
    </View>
  );
}

function LegendChip({ color, label, pct, empty }) {
  return (
    <View style={styles.legendChip}>
      <View style={[styles.legendDot, { backgroundColor: empty ? colors.border : color }]} />
      <Text style={styles.legendChipText}>
        {label} {empty ? '—' : `${pct}%`}
      </Text>
    </View>
  );
}

export default function WeeklyStatsCard({ stats, loading, error, onRetry }) {
  if (loading) {
    return (
      <View style={[styles.card, styles.centered]}>
        <Text style={styles.cardLabel}>Weekly stats</Text>
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.md }} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Weekly stats</Text>
        <Text style={styles.errorText}>{error}</Text>
        {onRetry ? (
          <Text style={styles.retryText} onPress={onRetry}>
            Tap to retry
          </Text>
        ) : null}
      </View>
    );
  }

  if (!stats || stats.daysWithData === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Weekly stats</Text>
        <Text style={styles.emptyText}>Log meals for a week to see your stats here</Text>
      </View>
    );
  }

  const target = Number(stats.dailyCalorieTarget) || 0;
  const daysWithData = Number(stats.daysWithData) || 0;
  const onTargetDenom = daysWithData;
  const onTargetPct =
    onTargetDenom > 0 ? Math.round(((stats.daysOnTarget || 0) / onTargetDenom) * 100) : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Weekly stats</Text>

      {stats.avgCalories != null ? (
        <MetricRow
          label="Avg daily calories"
          value={`${stats.avgCalories.toLocaleString()} kcal`}
          sub={target ? `/ ${target.toLocaleString()} kcal target` : null}
        />
      ) : null}

      {stats.daysOnTarget != null ? (
        <MetricRow
          label="Days within 90–110% of target"
          value={`${stats.daysOnTarget}/${onTargetDenom} days`}
          sub={`${onTargetPct}%`}
        />
      ) : null}

      <MacroSplitBar macroAvg={stats.macroAvg} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  centered: {
    minHeight: 120,
  },
  cardLabel: {
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  rowValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    flexShrink: 1,
  },
  rowValue: {
    color: colors.text,
    fontSize: typography.sizes.h3,
    fontFamily: typography.fontFamily.bold,
  },
  rowSub: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  macroBlock: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  bar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  barSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendChipText: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
  },
  emptyText: {
    color: colors.textDim,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.regular,
    fontStyle: 'italic',
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  retryText: {
    color: colors.accent,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
  },
});
