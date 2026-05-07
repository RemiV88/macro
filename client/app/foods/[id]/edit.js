import { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform, Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import FoodForm from '../../../components/FoodForm';
import { useConfirm } from '../../../components/ConfirmModal';
import { getFood, updateFood, deleteFood } from '../../../api/foods';
import { consumePendingPick } from '../_pendingPick';
import { colors, spacing, typography } from '../../../theme';

export default function EditFood() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { ask: askConfirm, modal: confirmModal } = useConfirm();

  const [food, setFood] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hydrate, setHydrate] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const pick = consumePendingPick();
      if (pick) setHydrate({ ...pick, portionSize: 100 });
    }, [])
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getFood(id);
        if (!cancelled) setFood(data);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err?.response?.data?.error || err.message || 'Could not load');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(payload) {
    setSubmitting(true);
    try {
      await updateFood(id, payload);
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/foods');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    const ok = await askConfirm({
      title: 'Delete food',
      message: `Are you sure you want to delete "${food?.name || 'this food'}"? This can't be undone.`,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteFood(id);
      router.replace('/(tabs)/foods');
    } catch (err) {
      setDeleting(false);
      const msg = err?.response?.data?.error || err.message || 'Could not delete';
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    }
  }

  function handleCancel() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/foods');
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{loadError}</Text>
      </View>
    );
  }

  if (!food) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <FoodForm
        initialFood={food}
        hydrate={hydrate}
        submitLabel="Save"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onDelete={handleDelete}
        onSearch={() => router.push('/foods/search')}
        submitting={submitting}
        deleting={deleting}
      />
      {confirmModal}
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: spacing.xl,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
  },
});
