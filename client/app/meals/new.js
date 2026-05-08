import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import MealTemplateForm from '../../components/MealTemplateForm';
import ScreenBackground from '../../components/ScreenBackground';
import { createMealTemplate } from '../../api/mealTemplates';
import { colors } from '../../theme';

export default function NewMealTemplate() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(payload) {
    setSubmitting(true);
    try {
      await createMealTemplate(payload);
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/meals');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/meals');
  }

  return (
    <View style={styles.outer}>
      <ScreenBackground />
      <MealTemplateForm
        submitLabel="Save meal"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitting={submitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.bg },
});
