import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { searchUsda } from '../../api/usda';
import { setPendingPick } from './_pendingPick';
import { colors, spacing, radius, typography } from '../../theme';

const DEBOUNCE_MS = 400;

export default function SearchFood() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      setLoading(false);
      setHasSearched(false);
      return;
    }

    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);

    const t = setTimeout(async () => {
      try {
        const foods = await searchUsda(trimmed);
        if (reqIdRef.current !== reqId) return;
        setResults(foods);
        setHasSearched(true);
      } catch (err) {
        if (reqIdRef.current !== reqId) return;
        setError(err?.response?.data?.error || err.message || 'Search failed');
        setResults([]);
        setHasSearched(true);
      } finally {
        if (reqIdRef.current === reqId) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [query]);

  function pick(food) {
    setPendingPick({
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    });
    if (router.canGoBack()) router.back();
    else router.replace('/foods/new');
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search USDA (e.g. chicken breast)"
          placeholderTextColor={colors.textDim}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : !hasSearched ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Type a food name to search USDA</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No results for "{query.trim()}"</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.fdcId)}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => pick(item)}>
              <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.preview}>
                {Math.round(item.calories)} kcal · {Math.round(item.protein)}g P
              </Text>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchWrap: {
    padding: spacing.xl,
    paddingBottom: spacing.lg,
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  row: {
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  name: {
    color: colors.text,
    fontSize: typography.sizes.bodyLg,
    fontFamily: typography.fontFamily.semibold,
  },
  preview: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
});
