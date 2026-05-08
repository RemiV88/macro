import { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import FoodForm from '../../components/FoodForm';
import ScreenBackground from '../../components/ScreenBackground';
import { createFood } from '../../api/foods';
import { consumePendingPick } from './_pendingPick';
import { colors } from '../../theme';

export default function NewFood() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [hydrate, setHydrate] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const pick = consumePendingPick();
      if (pick) setHydrate({ ...pick, portionSize: 100 });
    }, [])
  );

  async function handleSubmit(payload) {
    setSubmitting(true);
    try {
      await createFood(payload);
      router.replace('/(tabs)/foods');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/foods');
  }

  function handleSearch() {
    router.push('/foods/search');
  }

  return (
    <View style={styles.outer}>
      <ScreenBackground />
      <FoodForm
        submitLabel="Add food"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onSearch={handleSearch}
        hydrate={hydrate}
        submitting={submitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.bg },
});
