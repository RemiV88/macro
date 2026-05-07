import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../../theme';

export default function History() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>history — coming soon</Text>
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
  text: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
});
