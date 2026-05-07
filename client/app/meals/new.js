import { useState } from 'react';
import { useRouter } from 'expo-router';
import MealTemplateForm from '../../components/MealTemplateForm';
import { createMealTemplate } from '../../api/mealTemplates';

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
    <MealTemplateForm
      submitLabel="Save meal"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitting={submitting}
    />
  );
}
