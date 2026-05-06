import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'macro.token';
const USER_KEY = 'macro.user';

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token) {
  if (token == null) return SecureStore.deleteItemAsync(TOKEN_KEY);
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken() {
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getUser() {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setUser(user) {
  if (user == null) return SecureStore.deleteItemAsync(USER_KEY);
  return SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearUser() {
  return SecureStore.deleteItemAsync(USER_KEY);
}
