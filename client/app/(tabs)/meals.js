import { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { listMealTemplates, deleteMealTemplate } from '../../api/mealTemplates';
import MealCard from '../../components/MealCard';
import { useConfirm } from '../../components/ConfirmModal';
import { normalizeTemplateItem } from '../../utils/macros';
import { colors, spacing, radius, typography } from '../../theme';

function reportError(msg) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(msg);
  } else {
    Alert.alert('Error', msg);
  }
}

const PLACEHOLDER_ID = '__placeholder__';

export default function MealsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const numColumns = width < 600 ? 1 : 2;
  const { ask: askConfirm, modal: confirmModal } = useConfirm();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await listMealTemplates();
      setTemplates(data);
      hasLoadedRef.current = true;
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load({ silent: hasLoadedRef.current });
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load({ silent: true });
  }, [load]);

  const goToAdd = () => router.push('/meals/new');
  const goToDetail = (id) => router.push(`/meals/${id}`);
  const goToEdit = (id) => router.push(`/meals/${id}/edit`);

  const handleDelete = useCallback(
    async (template) => {
      const ok = await askConfirm({
        title: 'Delete meal template',
        message: `Are you sure you want to delete "${template.name}"? This can't be undone.`,
      });
      if (!ok) return;
      try {
        await deleteMealTemplate(template._id);
        load({ silent: true });
      } catch (err) {
        reportError(err?.response?.data?.error || err.message || 'Could not delete');
      }
    },
    [askConfirm, load]
  );

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>My Meals</Text>
      <Pressable style={styles.addBtn} onPress={goToAdd}>
        <Text style={styles.addBtnText}>+ Add</Text>
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (templates.length === 0) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.center}>
          <Text style={styles.emptyText}>No meal templates yet.</Text>
          <Text style={styles.emptyHint}>
            Save reusable meals (like "My usual breakfast") to log them in one tap.
          </Text>
          <Pressable style={styles.emptyBtn} onPress={goToAdd}>
            <Text style={styles.emptyBtnText}>+ Create your first meal template</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const data =
    numColumns > 1 && templates.length % 2 === 1
      ? [...templates, { _id: PLACEHOLDER_ID, __placeholder: true }]
      : templates;

  return (
    <View style={styles.container}>
      {header}
      <FlatList
        key={numColumns}
        data={data}
        numColumns={numColumns}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          if (item.__placeholder) return <View style={styles.placeholderCell} />;
          const items = (item.items || []).map(normalizeTemplateItem);
          return (
            <MealCard
              name={item.name}
              mealSlot={item.mealSlot}
              items={items}
              onPress={() => goToDetail(item._id)}
              onEdit={() => goToEdit(item._id)}
              onDelete={() => handleDelete(item)}
            />
          );
        }}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      />
      {confirmModal}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    width: '100%',
    maxWidth: 1000,
  },
  title: {
    fontSize: typography.sizes.h2,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
  },
  addBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentMuted,
  },
  addBtnText: {
    color: colors.accent,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
  },
  retryBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: {
    color: colors.text,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.sizes.h3,
    fontFamily: typography.fontFamily.medium,
  },
  emptyHint: {
    color: colors.textDim,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },
  emptyBtnText: {
    color: colors.bg,
    fontSize: typography.sizes.bodyLg,
    fontFamily: typography.fontFamily.semibold,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    width: '100%',
    maxWidth: 1000,
  },
  columnWrapper: {
    gap: spacing.md,
  },
  placeholderCell: { flex: 1 },
  gap: { height: spacing.md },
});
