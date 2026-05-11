import { Platform } from 'react-native';

export async function uploadImage(localUri) {
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary is not configured');
  }
  if (!localUri) {
    throw new Error('No image to upload');
  }

  const formData = new FormData();

  if (Platform.OS === 'web') {
    const res = await fetch(localUri);
    if (!res.ok) throw new Error('Could not read selected image');
    const blob = await res.blob();
    formData.append('file', blob, 'avatar.jpg');
  } else {
    formData.append('file', {
      uri: localUri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    });
  }
  formData.append('upload_preset', uploadPreset);

  let response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: formData }
    );
  } catch (err) {
    throw new Error('Network error while uploading image');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Unexpected response from image upload');
  }

  if (!response.ok || !data?.secure_url) {
    const msg = data?.error?.message || `Upload failed (${response.status})`;
    throw new Error(msg);
  }

  return data.secure_url;
}
