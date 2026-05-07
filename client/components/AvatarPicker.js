import { useState } from 'react';
import { View, Image, Pressable, Text, StyleSheet, Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CircleUser } from 'lucide-react-native';
import { colors, spacing, typography } from '../theme';

export default function AvatarPicker({ value, onChange, size = 80, disabled = false }) {
  const [picking, setPicking] = useState(false);

  async function handlePick() {
    if (disabled || picking) return;
    setPicking(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        const msg = 'Permission to access photos was denied.';
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined') window.alert(msg);
        } else {
          Alert.alert('Permission required', msg);
        }
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions
          ? ImagePicker.MediaTypeOptions.Images
          : ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        onChange?.(result.assets[0].uri);
      }
    } finally {
      setPicking(false);
    }
  }

  const circleStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const iconSize = Math.round(size * 0.5);

  return (
    <Pressable
      onPress={handlePick}
      disabled={disabled || picking}
      style={({ pressed }) => [
        styles.circle,
        circleStyle,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Pick profile photo"
    >
      {value ? (
        <Image source={{ uri: value }} style={[styles.image, circleStyle]} />
      ) : (
        <CircleUser size={iconSize} color={colors.accent} />
      )}
    </Pressable>
  );
}

export function AvatarPickerWithCaption({ value, onChange, size, disabled, caption }) {
  return (
    <View style={styles.wrapper}>
      <AvatarPicker value={value} onChange={onChange} size={size} disabled={disabled} />
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  circle: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  pressed: {
    opacity: 0.75,
  },
  caption: {
    color: colors.textMuted,
    fontSize: typography.sizes.caption,
    fontFamily: typography.fontFamily.medium,
  },
});
