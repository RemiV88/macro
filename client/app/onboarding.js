import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, typography } from '../theme';

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'active', label: 'Active' },
  { value: 'very_active', label: 'Very active' },
];

const GOALS = [
  { value: 'lose', label: 'Lose' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'gain', label: 'Gain' },
];

function ChoiceRow({ options, value, onChange, disabled }) {
  return (
    <View style={styles.choiceRow}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            disabled={disabled}
            onPress={() => onChange(opt.value)}
            style={[styles.choice, selected && styles.choiceSelected]}
          >
            <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function Onboarding() {
  const { refreshUser } = useAuth();

  const [age, setAge] = useState('');
  const [gender, setGender] = useState(null);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [hasFitnessTracker, setHasFitnessTracker] = useState(false);
  const [dailyBurnKcal, setDailyBurnKcal] = useState('');
  const [activityLevel, setActivityLevel] = useState(null);
  const [goal, setGoal] = useState(null);

  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);

    const ageN = Number(age);
    const heightN = Number(heightCm);
    const weightN = Number(weightKg);
    const targetN = Number(targetWeightKg);
    const burnN = Number(dailyBurnKcal);

    if (!ageN || !gender || !heightN || !weightN || !goal) {
      setError('Please fill in all fields');
      return;
    }
    if (hasFitnessTracker && !burnN) {
      setError('Please enter your daily burn');
      return;
    }
    if (!hasFitnessTracker && !activityLevel) {
      setError('Please pick an activity level');
      return;
    }
    if (goal !== 'maintain') {
      if (!targetN) {
        setError('Please enter your target weight');
        return;
      }
      if (targetN === weightN) {
        setError('Target weight must differ from current weight');
        return;
      }
      if (goal === 'lose' && targetN >= weightN) {
        setError('Target weight must be less than current weight');
        return;
      }
      if (goal === 'gain' && targetN <= weightN) {
        setError('Target weight must be more than current weight');
        return;
      }
    }

    setSubmitting(true);
    try {
      await api.patch('/users/me/onboarding', {
        age: ageN,
        gender,
        heightCm: heightN,
        weightKg: weightN,
        ...(goal !== 'maintain' ? { targetWeightKg: targetN } : {}),
        hasFitnessTracker,
        ...(hasFitnessTracker
          ? { dailyBurnKcal: burnN }
          : { activityLevel }),
        goal,
      });
      await refreshUser();
      // _layout sees onboardingComplete=true and routes to /(tabs)/today
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not save');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Tell us about you</Text>
      <Text style={styles.subtitle}>We'll use this to set your daily targets.</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Age</Text>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textDim}
          keyboardType="number-pad"
          value={age}
          onChangeText={setAge}
          editable={!submitting}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Gender</Text>
        <ChoiceRow options={GENDERS} value={gender} onChange={setGender} disabled={submitting} />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Height (cm)</Text>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textDim}
          keyboardType="number-pad"
          value={heightCm}
          onChangeText={setHeightCm}
          editable={!submitting}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Weight (kg)</Text>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textDim}
          keyboardType="decimal-pad"
          value={weightKg}
          onChangeText={setWeightKg}
          editable={!submitting}
        />
      </View>

      {goal && goal !== 'maintain' ? (
        <View style={styles.field}>
          <Text style={styles.label}>Target weight (kg)</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={colors.textDim}
            keyboardType="decimal-pad"
            value={targetWeightKg}
            onChangeText={setTargetWeightKg}
            editable={!submitting}
          />
        </View>
      ) : null}

      <View style={styles.field}>
        <View style={styles.row}>
          <Text style={styles.label}>I use a fitness tracker</Text>
          <Switch
            value={hasFitnessTracker}
            onValueChange={setHasFitnessTracker}
            disabled={submitting}
            trackColor={{ false: colors.surfaceAlt, true: colors.accent }}
            thumbColor={colors.text}
          />
        </View>
      </View>

      {hasFitnessTracker ? (
        <View style={styles.field}>
          <Text style={styles.label}>Average daily burn (kcal)</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={colors.textDim}
            keyboardType="number-pad"
            value={dailyBurnKcal}
            onChangeText={setDailyBurnKcal}
            editable={!submitting}
          />
        </View>
      ) : (
        <View style={styles.field}>
          <Text style={styles.label}>Activity level</Text>
          <ChoiceRow
            options={ACTIVITY_LEVELS}
            value={activityLevel}
            onChange={setActivityLevel}
            disabled={submitting}
          />
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>Goal</Text>
        <ChoiceRow options={GOALS} value={goal} onChange={setGoal} disabled={submitting} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.bg} />
        ) : (
          <Text style={styles.buttonText}>Save & continue</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: {
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.bg,
  },
  title: {
    fontSize: typography.sizes.h1,
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.regular,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  field: { gap: spacing.sm },
  label: {
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: typography.sizes.bodyLg,
    fontFamily: typography.fontFamily.medium,
    color: colors.text,
  },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceSelected: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  choiceText: {
    color: colors.text,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  choiceTextSelected: { color: colors.accent },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: colors.bg,
    fontSize: typography.sizes.bodyLg,
    fontFamily: typography.fontFamily.semibold,
  },
  error: {
    color: colors.danger,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
});
