import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { BookOpen, ChefHat, Apple } from 'lucide-react-native';
import { colors, spacing, radius, typography } from '../theme';

export default function LogActionSheet({ visible, onClose, onChoose }) {
  const options = [
    {
      key: 'template',
      label: 'Saved meals',
      hint: 'Use a saved meal',
      Icon: BookOpen,
    },
    {
      key: 'build',
      label: 'Build a new meal',
      hint: 'Combine multiple foods now',
      Icon: ChefHat,
    },
    {
      key: 'single',
      label: 'Snack',
      hint: 'Quick log a single food',
      Icon: Apple,
    },
  ];

  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>Log a meal</Text>
          <View style={styles.options}>
            {options.map((o) => (
              <Pressable
                key={o.key}
                onPress={() => onChoose(o.key)}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              >
                <View style={styles.iconWrap}>
                  <o.Icon size={20} color={colors.accent} />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{o.label}</Text>
                  <Text style={styles.optionHint}>{o.hint}</Text>
                </View>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.h3,
    fontFamily: typography.fontFamily.bold,
  },
  options: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionPressed: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent + '55',
  },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentMuted,
    borderRadius: radius.md,
  },
  optionText: { flex: 1, gap: 2 },
  optionLabel: {
    color: colors.text,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
  },
  optionHint: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.regular,
  },
  cancel: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cancelText: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
});
