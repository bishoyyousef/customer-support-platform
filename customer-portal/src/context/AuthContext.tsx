import React, { createContext, useContext, useState, useEffect } from 'react';
import { type User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session on app load
    const storedToken = localStorage.getItem('support_platform_token');
    const storedUser = localStorage.getItem('support_platform_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(username, password);
      // Validate customer role restriction
      if (res.user.role !== 'customer') {
        throw new Error('Unauthorized access: Only customer credentials can log into this portal.');
      }
      localStorage.setItem('support_platform_token', res.token);
      localStorage.setItem('support_platform_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
    } catch (err) {
      logout();
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('support_platform_token');
    localStorage.removeItem('support_platform_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
