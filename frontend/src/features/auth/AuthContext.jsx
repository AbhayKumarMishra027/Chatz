import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/api/auth/me').then(({ data }) => setUser(data.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);
  const value = useMemo(() => ({
    user, loading,
    async login(values) { const { data } = await api.post('/api/auth/login', values); setUser(data.user); return data.user; },
    async register(values) { const { data } = await api.post('/api/auth/register', values); setUser(data.user); return data.user; },
    async logout() { await api.post('/api/auth/logout'); setUser(null); },
    async refreshUser() { const { data } = await api.get('/api/auth/me'); setUser(data.user); return data.user; },
  }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
