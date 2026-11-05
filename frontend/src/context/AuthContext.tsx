import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api from '@/lib/api';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: (user: User, token?: string) => void;
  canEdit: boolean;
  isAdmin: boolean;
  /** Rol Consulta: solo Dashboard + filtros */
  isViewer: boolean;
  mustChangePassword: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function persist(user: User, token?: string) {
  if (token) localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const saved = localStorage.getItem('user');
    if (token && saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('user');
      }
      api
        .get('/auth/me')
        .then((r) => {
          setUser(r.data);
          localStorage.setItem('user', JSON.stringify(r.data));
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setLoading(false));
      return;
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const { data } = await api.post('/auth/login', { username, password });
    persist(data.user, data.token);
    setUser(data.user);
    return data.user as User;
  };

  const refreshUser = (next: User, token?: string) => {
    persist(next, token);
    setUser(next);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        canEdit: user?.role === 'ADMIN' || user?.role === 'EDITOR',
        isAdmin: user?.role === 'ADMIN',
        isViewer: user?.role === 'VIEWER',
        mustChangePassword: Boolean(user?.mustChangePassword),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}
