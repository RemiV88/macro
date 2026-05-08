import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { colors } from '../theme';

const DOT_SPACING = 24;
const DOT_RADIUS = 1.6;
const DOT_COLOR = '#1F1F23';
const DOT_OPACITY = 0.45;

// Pulled into a constant so we can reference the same id in <Pattern> + the
// fill on the dot-grid <Rect>. SVG ids are global within a document.
const DOT_PATTERN_ID = 'screen-bg-dot-pattern';
const ORB_TL_ID = 'screen-bg-orb-tl';
const ORB_BR_ID = 'screen-bg-orb-br';

export default function ScreenBackground() {
  // We size the SVG to whatever container we end up filling. Using onLayout
  // (instead of Dimensions) means we adapt to rotation, split-view, and web
  // resize without listening to events ourselves.
  const [size, setSize] = useState({ width: 0, height: 0 });

  return (
    <View
      style={styles.fill}
      onLayout={(e) => setSize(e.nativeEvent.layout)}
      pointerEvents="none"
    >
      {/* Solid base — sits below the SVG so the bg is opaque even before
          layout has measured (avoids a one-frame flash of white). */}
      <View style={styles.base} />

      {size.width > 0 && size.height > 0 ? (
        <Svg
          width={size.width}
          height={size.height}
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <Pattern
              id={DOT_PATTERN_ID}
              x="0"
              y="0"
              width={DOT_SPACING}
              height={DOT_SPACING}
              patternUnits="userSpaceOnUse"
            >
              <Circle
                cx={DOT_SPACING / 2}
                cy={DOT_SPACING / 2}
                r={DOT_RADIUS}
                fill={DOT_COLOR}
                fillOpacity={DOT_OPACITY}
              />
            </Pattern>

            {/* Top-left orb — soft accent halo. Centered at (15%, 20%) per
                spec, radius ≈ 40% of width. */}
            <RadialGradient
              id={ORB_TL_ID}
              cx={size.width * 0.15}
              cy={size.height * 0.2}
              rx={size.width * 0.4}
              ry={size.width * 0.4}
              fx={size.width * 0.15}
              fy={size.height * 0.2}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.22" />
              <Stop offset="60%" stopColor={colors.accent} stopOpacity="0.08" />
              <Stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
            </RadialGradient>

            {/* Bottom-right orb — slightly tighter, anchored at (85%, 90%). */}
            <RadialGradient
              id={ORB_BR_ID}
              cx={size.width * 0.85}
              cy={size.height * 0.9}
              rx={size.width * 0.3}
              ry={size.width * 0.3}
              fx={size.width * 0.85}
              fy={size.height * 0.9}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.18" />
              <Stop offset="60%" stopColor={colors.accent} stopOpacity="0.06" />
              <Stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Dot grid — covers the whole canvas with the repeating pattern. */}
          <Rect
            x="0"
            y="0"
            width={size.width}
            height={size.height}
            fill={`url(#${DOT_PATTERN_ID})`}
          />

          {/* Orbs painted on top of the dots. Two separate <Rect>s so each
              orb's gradient gets its own bounding box. */}
          <Rect
            x="0"
            y="0"
            width={size.width}
            height={size.height}
            fill={`url(#${ORB_TL_ID})`}
          />
          <Rect
            x="0"
            y="0"
            width={size.width}
            height={size.height}
            fill={`url(#${ORB_BR_ID})`}
          />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
  },
});
