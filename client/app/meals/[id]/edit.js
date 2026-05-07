import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MealTemplateForm from '../../../components/MealTemplateForm';
import { useConfirm } from '../../../components/ConfirmModal';
import {
  getMealTemplate,
  updateMealTemplate,
  deleteMealTemplate,
} from '../../../api/mealTemplates';
import { colors, spacing, typography } from '../../../theme';

export default function EditMealTemplate() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { ask: askConfirm, modal: confirmModal } = useConfirm();

  const [template, setTemplate] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getMealTemplate(id);
        if (!cancelled) setTemplate(data);
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
      await updateMealTemplate(id, payload);
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/meals');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    const ok = await askConfirm({
      title: 'Delete meal template',
      message: `Are you sure you want to delete "${template?.name || 'this meal'}"? This can't be undone.`,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteMealTemplate(id);
      router.replace('/(tabs)/meals');
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
    else router.replace('/(tabs)/meals');
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{loadError}</Text>
      </View>
    );
  }

  if (!template) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <MealTemplateForm
        initialTemplate={template}
        submitLabel="Save"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onDelete={handleDelete}
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
