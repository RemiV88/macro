import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Save } from 'lucide-react-native';
import { AvatarPickerWithCaption } from '../../components/AvatarPicker';
import Input from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { updateMe } from '../../api/users';
import { colors, spacing, radius, typography } from '../../theme';

export default function EditProfile() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [profileImageUrl, setProfileImageUrl] = useState(user?.profileImageUrl || null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSubmitting(true);
    try {
      await updateMe({
        name: name.trim(),
        profileImageUrl: profileImageUrl || null,
      });
      await refreshUser();
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/profile');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not save');
      setSubmitting(false);
    }
  }

  function handleCancel() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.avatarBlock}>
        <AvatarPickerWithCaption
          value={profileImageUrl}
          onChange={setProfileImageUrl}
          size={104}
          caption="Tap to change photo"
          disabled={submitting}
        />
      </View>

      <Input
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        editable={!submitting}
        autoCapitalize="words"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          onPress={handleSave}
          disabled={submitting}
          style={({ pressed }) => [
            styles.glassBtn,
            styles.submitBtn,
            pressed && styles.btnPressed,
            submitting && styles.btnDisabled,
          ]}
          accessibilityRole="button"
        >
          {submitting ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <>
              <Save size={18} color={colors.accent} />
              <Text style={styles.submitText}>Save</Text>
            </>
          )}
        </Pressable>
        <Pressable
          onPress={handleCancel}
          disabled={submitting}
          style={({ pressed }) => [
            styles.cancelBtn,
            pressed && styles.btnPressed,
            submitting && styles.btnDisabled,
          ]}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: {
    padding: spacing.xl,
    gap: spacing.lg,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  avatarBlock: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  error: {
    color: colors.danger,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  glassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 12px rgba(0, 148, 232, 0.12)',
        transitionDuration: '120ms',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  submitBtn: {
    minWidth: 120,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent + '33',
  },
  submitText: {
    color: colors.accent,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.semibold,
  },
  cancelBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  cancelText: {
    color: colors.textMuted,
    fontSize: typography.sizes.body,
    fontFamily: typography.fontFamily.medium,
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  btnDisabled: { opacity: 0.5 },
});
