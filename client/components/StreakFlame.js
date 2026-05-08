import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Flame } from 'lucide-react-native';
import { colors, spacing, typography, radius } from '../theme';

const BASE_PARTICLE_COUNT = 7;
const BIG_PARTICLE_COUNT = 12; // streak ≥ 7 — more particles instead of a glow
const PARTICLE_DURATION_MS = 1700;

// Pure flame palette — no accent blue. Per-particle color is picked
// deterministically from this list so the flame reads warm.
const PARTICLE_COLORS = ['#FF6B00', '#FF8800', '#FF4500', '#FFA500', '#FFD700'];

function Particle({ index, color, sizeBoost = 0 }) {
  const progress = useSharedValue(0);

  // Stable per-particle offsets keep each one on its own track instead of
  // every dot tracing the same arc.
  const { startX, drift, size, delay, duration } = useMemo(() => {
    const rand = (seed) => {
      // tiny deterministic hash so re-renders don't reshuffle the layout
      const x = Math.sin(seed * 9999 + index * 31) * 10000;
      return x - Math.floor(x);
    };
    return {
      startX: -16 + rand(1) * 32,
      drift: -10 + rand(2) * 20,
      size: 3 + rand(3) * 3 + sizeBoost,
      delay: rand(4) * PARTICLE_DURATION_MS,
      duration: PARTICLE_DURATION_MS + rand(5) * 600,
    };
  }, [index, sizeBoost]);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.out(Easing.quad) }),
        -1,
        false
      )
    );
  }, [progress, delay, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [
        { translateX: startX + drift * p },
        { translateY: -p * 70 },
        { scale: 1 - p * 0.4 },
      ],
      opacity: p < 0.1 ? p * 10 : 1 - (p - 0.1) / 0.9,
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function StreakFlame({ streak = 0 }) {
  const active = streak >= 1;
  const big = streak >= 7;

  const flameScale = useSharedValue(1);

  useEffect(() => {
    if (!active) {
      flameScale.value = 1;
      return;
    }
    flameScale.value = withRepeat(
      withTiming(1.05, { duration: 750, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [active, flameScale]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  const flameSize = big ? 56 : 44;
  const flameColor = active ? '#FF8800' : colors.textMuted;
  const particleCount = big ? BIG_PARTICLE_COUNT : BASE_PARTICLE_COUNT;
  // Streak ≥ 7 swaps the glow for chunkier, more-numerous embers.
  const particleSizeBoost = big ? 2 : 0;

  return (
    <View style={styles.container} accessibilityLabel={`${streak} day streak`}>
      <View style={styles.flameStage}>
        {active
          ? Array.from({ length: particleCount }).map((_, i) => (
              <Particle
                key={i}
                index={i}
                color={PARTICLE_COLORS[i % PARTICLE_COLORS.length]}
                sizeBoost={particleSizeBoost}
              />
            ))
          : null}

        <Animated.View style={flameStyle}>
          <Flame size={flameSize} color={flameColor} fill={active ? flameColor : 'transparent'} />
        </Animated.View>
      </View>

      {active ? (
        <View style={styles.labelRow}>
          <Text style={[styles.streakNumber, big && styles.streakNumberBig]}>{streak}</Text>
          <Text style={styles.streakLabel}>
            {streak === 1 ? 'day streak' : 'day streak'}
          </Text>
        </View>
      ) : (
        <Text style={styles.startCaption}>Start your streak today</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  flameStage: {
    width: 120,
    height: 96,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.xs,
  },
  particle: {
    position: 'absolute',
    bottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  streakNumber: {
    color: colors.text,
    fontSize: typography.sizes.h1,
    fontFamily: typography.fontFamily.bold,
  },
  streakNumberBig: {
    fontSize: typography.sizes.display,
    color: colors.text,
  },
  streakLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  startCaption: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
});
