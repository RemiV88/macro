import axios from 'axios';
import Constants from 'expo-constants';
import { getToken } from './auth';

// --- API base URL ---
//
// Your phone (running Expo Go) is NOT on the same loopback as your laptop, so
// `http://localhost:5001` will fail when you scan the QR with a real device.
//
// Two ways to set the host:
//
//   1. .env file at /client/.env  (preferred — no code edits)
//        EXPO_PUBLIC_API_URL=http://192.168.1.42:5001/api
//      Restart `npx expo start` after changing it.
//
//   2. Hardcode FALLBACK_HOST below to your machine's LAN IP.
//      Find it: System Settings → Wi-Fi → Details → IP Address  (e.g. 192.168.1.42)
//      Or in Terminal: `ipconfig getifaddr en0`
//
// In Expo Go, Expo also exposes the host that served the bundle via
// Constants.expoConfig.hostUri (e.g. "192.168.1.42:8081"). We fall back to that
// IP automatically so on most setups you don't need to configure anything.

const FALLBACK_HOST = 'localhost'; // <-- replace with your LAN IP if auto-detect fails
const PORT = 5001;

function resolveBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.developer?.hostUri;

  const host = hostUri ? hostUri.split(':')[0] : FALLBACK_HOST;
  return `http://${host}:${PORT}/api`;
}

const baseURL = resolveBaseUrl();

if (__DEV__) {
  console.log('[api] baseURL =', baseURL);
}

const api = axios.create({
  baseURL,
  timeout: 8000,
});

api.interceptors.request.use(async (config) => {
  const url = `${config.baseURL || ''}${config.url || ''}`;
  console.log('[api] →', config.method?.toUpperCase(), url);
  console.log('[api]   before getToken');
  const token = await getToken();
  console.log('[api]   after  getToken, hasToken =', !!token);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    console.log('[api] ←', res.status, res.config.url);
    return res;
  },
  (err) => {
    console.log(
      '[api] ✕',
      err.config?.method?.toUpperCase(),
      err.config?.url,
      '— code:',
      err.code,
      'message:',
      err.message,
      'status:',
      err.response?.status
    );
    return Promise.reject(err);
  }
);

export default api;
