import { View, Text, StyleSheet } from 'react-native';

export default function Today() {
  return (
    <View style={styles.container}>
      <Text>today — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
