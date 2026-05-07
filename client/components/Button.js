import { Pressable, Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../theme';

export default function Button({
  title,
  icon,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
}) {
  const isDisabled = disabled || loading;
  const containerStyles = [
    styles.base,
    size === 'sm' && styles.sizeSm,
    size === 'md' && styles.sizeMd,
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'danger' && styles.danger,
    variant === 'ghost' && styles.ghost,
    isDisabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.textBase,
    size === 'sm' && styles.textSm,
    variant === 'primary' && styles.textPrimary,
    variant === 'secondary' && styles.textSecondary,
    variant === 'danger' && styles.textDanger,
    variant === 'ghost' && styles.textGhost,
  ];

  const spinnerColor = variant === 'primary' ? colors.bg : colors.text;

  return (
    <Pressable style={containerStyles} onPress={onPress} disabled={isDisabled}>
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={title ? styles.iconWithText : null}>{icon}</View> : null}
          {title ? <Text style={textStyles}>{title}</Text> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWithText: {
    marginRight: spacing.sm,
  },
  sizeSm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  sizeMd: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.accent },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
  textBase: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.sizes.bodyLg,
  },
  textSm: { fontSize: typography.sizes.body },
  textPrimary: { color: colors.bg },
  textSecondary: { color: colors.text },
  textDanger: { color: colors.danger },
  textGhost: { color: colors.textMuted },
});
