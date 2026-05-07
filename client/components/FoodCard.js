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
import { categoryIcons } from './categoryIcons';
import { colors, spacing, radius, typography } from '../theme';

function categoryLabel(c) {
  if (!c) return '';
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function getDisplayName(name) {
  if (!name) return '';
  return name.split(',')[0].trim();
}

export default function FoodCard({ food, onPress, onEdit, onDelete }) {
  const dotsRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);

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
      food.name,
      undefined,
      [
        { text: 'Edit', onPress: onEdit },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
        { text: 'Cancel', style: 'cancel' },
      ],
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

  const calories = Math.round(food.caloriesPer100g);
  const protein = Math.round(food.proteinPer100g);

  return (
    <View style={styles.wrapper}>
      <Pressable style={styles.card} onPress={onPress}>
        <Text style={styles.name} numberOfLines={1}>{getDisplayName(food.name)}</Text>
        {food.category ? (() => {
          const CategoryIcon = categoryIcons[food.category];
          return (
            <View style={styles.categoryRow}>
              {CategoryIcon ? <CategoryIcon size={14} color={colors.textMuted} /> : null}
              <Text style={styles.category}>{categoryLabel(food.category)}</Text>
            </View>
          );
        })() : null}
        <View style={styles.macroRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{calories}</Text>
            <View style={styles.labelRow}>
              <Zap size={14} color={colors.textMuted} />
              <Text style={styles.statLabel}>kcal</Text>
            </View>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{protein}g</Text>
            <View style={styles.labelRow}>
              <BicepsFlexed size={14} color={colors.textMuted} />
              <Text style={styles.statLabel}>protein</Text>
            </View>
          </View>
        </View>
      </Pressable>

      <Pressable
        ref={dotsRef}
        style={styles.dotsBtn}
        onPress={openMenu}
        hitSlop={8}
        accessibilityLabel={`Actions for ${food.name}`}
      >
        <Text style={styles.dotsText}>⋮</Text>
      </Pressable>

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
              <Pressable style={styles.menuItem} onPress={handleEdit}>
                <Text style={styles.menuItemText}>Edit</Text>
              </Pressable>
              <Pressable style={[styles.menuItem, styles.menuItemRow]} onPress={handleDelete}>
                <Trash2 size={18} color={colors.danger} />
                <Text style={[styles.menuItemText, styles.menuItemDanger]}>Delete</Text>
              </Pressable>
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
  name: {
    color: colors.text,
    fontSize: typography.sizes.h3,
    fontFamily: typography.fontFamily.bold,
  },
  category: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  macroRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.md,
  },
  stat: {
    gap: 2,
  },
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
  dotsBtn: {
    position: 'absolute',
    bottom: spacing.sm,
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
