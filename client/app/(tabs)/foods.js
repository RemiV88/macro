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
import { listFoods, deleteFood } from '../../api/foods';
import FoodCard from '../../components/FoodCard';
import { useConfirm } from '../../components/ConfirmModal';
import ScreenBackground from '../../components/ScreenBackground';
import { colors, spacing, radius, typography } from '../../theme';

function reportError(msg) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(msg);
  } else {
    Alert.alert('Error', msg);
  }
}

const PLACEHOLDER_ID = '__placeholder__';

export default function FoodsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const numColumns = width < 600 ? 1 : 2;
  const { ask: askConfirm, modal: confirmModal } = useConfirm();
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await listFoods();
      setFoods(data);
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

  const goToAdd = () => router.push('/foods/new');
  const goToDetail = (id) => router.push(`/foods/${id}`);
  const goToEdit = (id) => router.push(`/foods/${id}/edit`);

  const handleDelete = useCallback(
    async (food) => {
      const ok = await askConfirm({
        title: 'Delete food',
        message: `Are you sure you want to delete "${food.name}"? This can't be undone.`,
      });
      if (!ok) return;
      try {
        await deleteFood(food._id);
        load({ silent: true });
      } catch (err) {
        reportError(err?.response?.data?.error || err.message || 'Could not delete');
      }
    },
    [askConfirm, load]
  );

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>My Food Items</Text>
      <Pressable style={styles.addBtn} onPress={goToAdd}>
        <Text style={styles.addBtnText}>+ Add</Text>
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenBackground />
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
        <ScreenBackground />
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

  if (foods.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenBackground />
        {header}
        <View style={styles.center}>
          <Text style={styles.emptyText}>No foods yet.</Text>
          <Text style={styles.emptyHint}>Build your library to log meals faster.</Text>
          <Pressable style={styles.emptyBtn} onPress={goToAdd}>
            <Text style={styles.emptyBtnText}>+ Add your first food item</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const data =
    numColumns > 1 && foods.length % 2 === 1
      ? [...foods, { _id: PLACEHOLDER_ID, __placeholder: true }]
      : foods;

  return (
    <View style={styles.container}>
      <ScreenBackground />
      {header}
      <FlatList
        key={numColumns}
        data={data}
        numColumns={numColumns}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          if (item.__placeholder) return <View style={styles.placeholderCell} />;
          return (
            <FoodCard
              food={item}
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
  placeholderCell: {
    flex: 1,
  },
  gap: {
    height: spacing.md,
  },
});
