import { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { Trash2, Zap, BicepsFlexed } from 'lucide-react-native';
import { computeMealTotals, slotLabel } from '../utils/macros';
import { colors, spacing, radius, typography } from '../theme';

export default function MealCard({
  name,
  mealSlot,
  items,
  onPress,
  onEdit,
  onDelete,
  showSlotLabel = true,
}) {
  const dotsRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);

  const totals = computeMealTotals(items || []);
  const titleLabel = name || slotLabel(mealSlot);
  const accessibleName = name || slotLabel(mealSlot) || 'Meal';

  function openMenu() {
    if (Platform.OS === 'web') {
      if (dotsRef.current?.measureInWindow) {
        dotsRef.current.measureInWindow((x, y, width, height) => {
          setAnchor({ x, y, width, height });
          setMenuOpen(true);
        });
      } else {
        setAnchor(null);
        setMenuOpen(true);
      }
      return;
    }
    Alert.alert(
      accessibleName,
      undefined,
      [
        onEdit ? { text: 'Edit', onPress: onEdit } : null,
        onDelete ? { text: 'Delete', style: 'destructive', onPress: onDelete } : null,
        { text: 'Cancel', style: 'cancel' },
      ].filter(Boolean),
      { cancelable: true }
    );
  }

  function closeMenu() {
    setMenuOpen(false);
  }
  function handleEdit() {
    closeMenu();
    onEdit?.();
  }
  function handleDelete() {
    closeMenu();
    onDelete?.();
  }

  return (
    <View style={styles.wrapper}>
      <Pressable style={styles.card} onPress={onPress}>
        {showSlotLabel && mealSlot ? (
          <Text style={styles.slotLabel}>{slotLabel(mealSlot)}</Text>
        ) : null}
        <Text style={styles.name} numberOfLines={1}>
          {titleLabel}
        </Text>

        <View style={styles.macroRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{Math.round(totals.kcal)}</Text>
            <View style={styles.labelRow}>
              <Zap size={14} color={colors.textMuted} />
              <Text style={styles.statLabel}>kcal</Text>
            </View>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{Math.round(totals.protein)}g</Text>
            <View style={styles.labelRow}>
              <BicepsFlexed size={14} color={colors.textMuted} />
              <Text style={styles.statLabel}>protein</Text>
            </View>
          </View>
        </View>

        {items && items.length > 0 ? (
          <View style={styles.itemsList}>
            {items.map((it, idx) => {
              const itemKcal = Math.round(((it.caloriesPer100g || 0) * it.portionGrams) / 100);
              return (
                <Text key={it._id || it.foodId || idx} style={styles.itemRow} numberOfLines={1}>
                  {Math.round(it.portionGrams)}g {it.name} · {itemKcal} kcal
                </Text>
              );
            })}
          </View>
        ) : null}
      </Pressable>

      {(onEdit || onDelete) ? (
        <Pressable
          ref={dotsRef}
          style={styles.dotsBtn}
          onPress={openMenu}
          hitSlop={8}
          accessibilityLabel={`Actions for ${accessibleName}`}
        >
          <Text style={styles.dotsText}>⋮</Text>
        </Pressable>
      ) : null}

      {Platform.OS === 'web' && menuOpen ? (
        <Modal
          transparent
          animationType="fade"
          visible
          onRequestClose={closeMenu}
        >
          <Pressable style={styles.backdrop} onPress={closeMenu}>
            <View
              style={[
                styles.menu,
                anchor
                  ? {
                      top: anchor.y + anchor.height + 4,
                      left: Math.max(spacing.sm, anchor.x + anchor.width - MENU_WIDTH),
                    }
                  : styles.menuFallback,
              ]}
            >
              {onEdit ? (
                <Pressable style={styles.menuItem} onPress={handleEdit}>
                  <Text style={styles.menuItemText}>Edit</Text>
                </Pressable>
              ) : null}
              {onDelete ? (
                <Pressable style={[styles.menuItem, styles.menuItemRow]} onPress={handleDelete}>
                  <Trash2 size={18} color={colors.danger} />
                  <Text style={[styles.menuItemText, styles.menuItemDanger]}>Delete</Text>
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const MENU_WIDTH = 160;

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  slotLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  name: {
    color: colors.text,
    fontSize: typography.sizes.h3,
    fontFamily: typography.fontFamily.bold,
  },
  macroRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.sm,
  },
  stat: { gap: 2 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  statValue: {
    color: colors.accent,
    fontSize: typography.sizes.h3,
    fontFamily: typography.fontFamily.bold,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
  },
  itemsList: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  itemRow: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.regular,
  },
  dotsBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  dotsText: {
    color: colors.textMuted,
    fontSize: typography.sizes.h2,
    fontFamily: typography.fontFamily.bold,
    lineHeight: typography.sizes.h2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
  },
  menuFallback: {
    top: spacing.xxxl,
    right: spacing.lg,
  },
  menuItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  menuItemText: {
    color: colors.text,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  menuItemDanger: {
    color: colors.danger,
  },
});
