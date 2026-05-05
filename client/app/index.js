import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import api from '../api';

export default function Home() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/health')
      .then((res) => setHealth(res.data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Macro</Text>
      <Text style={styles.subtitle}>home — coming soon</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Backend health</Text>
        {health ? (
          <Text style={styles.cardValue}>{JSON.stringify(health)}</Text>
        ) : error ? (
          <Text style={styles.error}>error: {error}</Text>
        ) : (
          <ActivityIndicator />
        )}
      </View>

      <View style={styles.links}>
        <Link href="/login" style={styles.link}>Go to Login</Link>
        <Link href="/signup" style={styles.link}>Go to Signup</Link>
        <Link href="/onboarding" style={styles.link}>Go to Onboarding</Link>
        <Link href="/(tabs)/today" style={styles.link}>Enter app (Tabs)</Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 32, fontWeight: '700' },
  subtitle: { fontSize: 16, color: '#666' },
  card: { padding: 16, borderRadius: 12, backgroundColor: '#f2f2f2', minWidth: 240, alignItems: 'center', gap: 4 },
  cardLabel: { fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 1 },
  cardValue: { fontSize: 16, fontFamily: 'Courier' },
  error: { color: 'crimson' },
  links: { gap: 8, marginTop: 8 },
  link: { color: '#2563eb', fontSize: 16 },
});
