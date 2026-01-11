import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@shogunito/shared';
import { apiService } from '../shared/api/client';
import type { AuthResponse, LoginDto, RegisterDto } from '../shared/api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginDto) => Promise<AuthResponse>;
  register: (data: RegisterDto) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const currentUser = apiService.getCurrentUser();
      if (currentUser && apiService.isAuthenticated()) {
        // Set user immediately from localStorage for faster UI update
        setUser(currentUser);

        // Then verify that the token is still valid
        try {
          const profile = await apiService.getProfile();
          setUser(profile);
        } catch {
          // Si el token no es válido, limpiar todo
          apiService.clearTokens();
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      const data = await apiService.getAuthStatus();

      if (!data.authEnabled) {
        // Autenticación deshabilitada, usar usuario mock
        setUser(data.mockUser);
        setIsLoading(false);
        return;
      }

      // Autenticación habilitada, verificar token existente
      checkAuth();
    } catch (error) {
      console.error('Error verificando estado de autenticación:', error);
      // Si falla, asumir que auth está habilitada y continuar normalmente
      checkAuth();
    }
  }, [checkAuth]);

  useEffect(() => {
    // Primero verificar si la autenticación está habilitada
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Listen for storage events to sync auth state across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // When accessToken or refreshToken changes in another tab, re-check auth
      if (e.key === 'accessToken' || e.key === 'refreshToken' || e.key === 'user') {
        if (e.newValue) {
          // Token was set in another tab, verify and sync
          setIsLoading(true);
          checkAuth();
        } else {
          // Token was removed in another tab, clear local state
          setUser(null);
          setIsLoading(false);
        }
      }
    };

    // Also listen for custom storage events (for same-tab updates)
    const handleCustomStorage = () => {
      setIsLoading(true);
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-storage-change', handleCustomStorage);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-storage-change', handleCustomStorage);
    };
  }, [checkAuth]);

  const login = async (credentials: LoginDto): Promise<AuthResponse> => {
    try {
      const response = await apiService.login(credentials);
      setUser(response.user);
      return response;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  };

  const register = async (data: RegisterDto): Promise<AuthResponse> => {
    try {
      const response = await apiService.register(data);
      setUser(response.user);
      return response;
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
      setUser(null);
    } catch (error) {
      console.error('Error en logout:', error);
      // Limpiar de todas formas
      apiService.clearTokens();
      setUser(null);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
