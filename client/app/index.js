import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme';

// Index is just a placeholder — _layout.js redirects everyone here either to
// /login, /onboarding, or /(tabs)/today depending on their auth state.
export default function Index() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
