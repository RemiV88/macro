import { View, Text, StyleSheet } from 'react-native';

export default function Foods() {
  return (
    <View style={styles.container}>
      <Text>foods — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
