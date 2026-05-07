import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../theme';

export default function ChipRow({ options, value, onChange, disabled = false }) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const optValue = typeof opt === 'string' ? opt : opt.value;
        const optLabel = typeof opt === 'string' ? opt : opt.label;
        const Icon = typeof opt === 'object' ? opt.Icon : null;
        const selected = value === optValue;
        const iconColor = selected ? colors.accent : colors.textMuted;
        return (
          <Pressable
            key={optValue}
            disabled={disabled}
            onPress={() => onChange(optValue)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            {Icon ? <Icon size={14} color={iconColor} /> : null}
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {optLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
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
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  chipTextSelected: { color: colors.accent },
});
