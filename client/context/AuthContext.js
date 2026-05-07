import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api';
import * as authStore from '../auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from secure store on mount.
  useEffect(() => {
    (async () => {
      try {
        const [token, storedUser] = await Promise.all([
          authStore.getToken(),
          authStore.getUser(),
        ]);
        if (token && storedUser) {
          setUser(storedUser);
          // Refresh from server in the background — silently keeps user fresh
          // (e.g. onboardingComplete may have changed on another device).
          api
            .get('/auth/me')
            .then(async ({ data }) => {
              setUser(data.user);
              await authStore.setUser(data.user);
            })
            .catch(async (err) => {
              if (err?.response?.status === 401) {
                await authStore.clearToken();
                await authStore.clearUser();
                setUser(null);
              }
            });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (token, nextUser) => {
    await authStore.setToken(token);
    await authStore.setUser(nextUser);
    setUser(nextUser);
  }, []);

  const signup = useCallback(
    async (name, email, password, profileImageUrl) => {
      const { data } = await api.post('/auth/signup', {
        name,
        email,
        password,
        profileImageUrl: profileImageUrl || null,
      });
      await persist(data.token, data.user);
      return data.user;
    },
    [persist]
  );

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post('/auth/login', { email, password });
      await persist(data.token, data.user);
      return data.user;
    },
    [persist]
  );

  const logout = useCallback(async () => {
    await authStore.clearToken();
    await authStore.clearUser();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
    await authStore.setUser(data.user);
    return data.user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
