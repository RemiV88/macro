import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors, spacing, radius, typography } from '../theme';

const SIZE = 132;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

export const MACRO_COLORS = {
  protein: colors.accent,
  carbs: colors.warning,
  fat: colors.success,
};

const MACRO_LABEL = {
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
};

const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 };

// Stack three concentric stroked Circles, each carrying one segment via
// stroke-dasharray. Rotation -90deg puts the start of the first segment at
// 12 o'clock; subsequent segments offset by the cumulative arc length so they
// sit end-to-end with no gaps.
function Segment({ fraction, offsetFraction, color }) {
  if (fraction <= 0) return null;
  const dashLen = CIRC * fraction;
  const dashGap = CIRC - dashLen;
  const dashOffset = -CIRC * offsetFraction;
  return (
    <Circle
      cx={SIZE / 2}
      cy={SIZE / 2}
      r={RADIUS}
      stroke={color}
      strokeWidth={STROKE}
      strokeDasharray={`${dashLen} ${dashGap}`}
      strokeDashoffset={dashOffset}
      strokeLinecap="butt"
      fill="none"
    />
  );
}

export default function MacroDonut({ totals }) {
  const protein = Math.max(0, Number(totals?.protein) || 0);
  const carbs = Math.max(0, Number(totals?.carbs) || 0);
  const fat = Math.max(0, Number(totals?.fat) || 0);

  const proteinKcal = protein * KCAL_PER_G.protein;
  const carbsKcal = carbs * KCAL_PER_G.carbs;
  const fatKcal = fat * KCAL_PER_G.fat;
  const totalKcal = proteinKcal + carbsKcal + fatKcal;
  const isEmpty = totalKcal <= 0;

  const fractions = isEmpty
    ? { protein: 0, carbs: 0, fat: 0 }
    : {
        protein: proteinKcal / totalKcal,
        carbs: carbsKcal / totalKcal,
        fat: fatKcal / totalKcal,
      };
  const percents = {
    protein: Math.round(fractions.protein * 100),
    carbs: Math.round(fractions.carbs * 100),
    fat: Math.round(fractions.fat * 100),
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Macros today</Text>

      <View style={styles.body}>
        <View style={styles.donutWrap}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <G rotation={-90} originX={SIZE / 2} originY={SIZE / 2}>
              {isEmpty ? (
                <Circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  stroke={colors.border}
                  strokeWidth={STROKE}
                  fill="none"
                />
              ) : (
                <>
                  <Segment
                    fraction={fractions.protein}
                    offsetFraction={0}
                    color={MACRO_COLORS.protein}
                  />
                  <Segment
                    fraction={fractions.carbs}
                    offsetFraction={fractions.protein}
                    color={MACRO_COLORS.carbs}
                  />
                  <Segment
                    fraction={fractions.fat}
                    offsetFraction={fractions.protein + fractions.carbs}
                    color={MACRO_COLORS.fat}
                  />
                </>
              )}
            </G>
          </Svg>
          <View style={styles.center} pointerEvents="none">
            <Text style={styles.centerValue}>
              {isEmpty ? '—' : Math.round(totalKcal).toLocaleString()}
            </Text>
            {!isEmpty ? <Text style={styles.centerLabel}>kcal</Text> : null}
          </View>
        </View>

        <View style={styles.legend}>
          <LegendRow
            color={MACRO_COLORS.protein}
            label={MACRO_LABEL.protein}
            grams={protein}
            percent={percents.protein}
            empty={isEmpty}
          />
          <LegendRow
            color={MACRO_COLORS.carbs}
            label={MACRO_LABEL.carbs}
            grams={carbs}
            percent={percents.carbs}
            empty={isEmpty}
          />
          <LegendRow
            color={MACRO_COLORS.fat}
            label={MACRO_LABEL.fat}
            grams={fat}
            percent={percents.fat}
            empty={isEmpty}
          />
        </View>
      </View>

      {isEmpty ? (
        <Text style={styles.caption}>Log a meal to see your breakdown</Text>
      ) : null}
    </View>
  );
}

function LegendRow({ color, label, grams, percent, empty }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.dot, { backgroundColor: empty ? colors.border : color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>
        {empty ? '—' : `${Math.round(grams)}g · ${percent}%`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 12px rgba(0, 148, 232, 0.06)',
      },
    }),
  },
  title: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  donutWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerValue: {
    color: colors.text,
    fontSize: typography.sizes.h2,
    fontFamily: typography.fontFamily.bold,
  },
  centerLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
    marginTop: -2,
  },
  legend: {
    flex: 1,
    gap: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    color: colors.text,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
    flex: 1,
  },
  legendValue: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  caption: {
    color: colors.textDim,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.regular,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
