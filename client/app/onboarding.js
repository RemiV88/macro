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

    setSubmitting(true);
    try {
      await api.patch('/users/me/onboarding', {
        age: ageN,
        gender,
        heightCm: heightN,
        weightKg: weightN,
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
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Tell us about you</Text>
      <Text style={styles.subtitle}>We'll use this to set your daily targets.</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Age</Text>
        <TextInput
          style={styles.input}
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
          keyboardType="decimal-pad"
          value={weightKg}
          onChangeText={setWeightKg}
          editable={!submitting}
        />
      </View>

      <View style={styles.field}>
        <View style={styles.row}>
          <Text style={styles.label}>I use a fitness tracker</Text>
          <Switch
            value={hasFitnessTracker}
            onValueChange={setHasFitnessTracker}
            disabled={submitting}
          />
        </View>
      </View>

      {hasFitnessTracker ? (
        <View style={styles.field}>
          <Text style={styles.label}>Average daily burn (kcal)</Text>
          <TextInput
            style={styles.input}
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
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save & continue</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16, backgroundColor: '#fff' },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 8 },
  field: { gap: 6 },
  label: { fontSize: 14, color: '#333', fontWeight: '500' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    backgroundColor: '#fff',
  },
  choiceSelected: { backgroundColor: '#111', borderColor: '#111' },
  choiceText: { color: '#111', fontSize: 14 },
  choiceTextSelected: { color: '#fff' },
  button: {
    backgroundColor: '#111',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: 'crimson', fontSize: 14 },
});
