import { View, Text, StyleSheet } from 'react-native';

export default function Onboarding() {
  return (
    <View style={styles.container}>
      <Text>onboarding — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
