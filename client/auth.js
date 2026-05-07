import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'macro.token';
const USER_KEY = 'macro.user';

const isWeb = Platform.OS === 'web';

async function getItem(key) {
  return isWeb ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
}

async function setItem(key, value) {
  return isWeb ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value);
}

async function deleteItem(key) {
  return isWeb ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key);
}

export async function getToken() {
  return getItem(TOKEN_KEY);
}

export async function setToken(token) {
  if (token == null) return deleteItem(TOKEN_KEY);
  return setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  return deleteItem(TOKEN_KEY);
}

export async function getUser() {
  const raw = await getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setUser(user) {
  if (user == null) return deleteItem(USER_KEY);
  return setItem(USER_KEY, JSON.stringify(user));
}

export async function clearUser() {
  return deleteItem(USER_KEY);
}
