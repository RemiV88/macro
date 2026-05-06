import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function Profile() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email ?? '—'}</Text>
      </View>

      {user?.dailyCalorieTarget ? (
        <View style={styles.card}>
          <Text style={styles.label}>Daily target</Text>
          <Text style={styles.value}>{user.dailyCalorieTarget} kcal</Text>
          <Text style={styles.macros}>
            P {user.proteinTarget}g · C {user.carbsTarget}g · F {user.fatTarget}g
          </Text>
        </View>
      ) : null}

      <Pressable style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16, backgroundColor: '#fff' },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f4f4f5',
    gap: 4,
  },
  label: { fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 1 },
  value: { fontSize: 18, fontWeight: '600' },
  macros: { fontSize: 14, color: '#444' },
  button: {
    marginTop: 'auto',
    backgroundColor: '#111',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
