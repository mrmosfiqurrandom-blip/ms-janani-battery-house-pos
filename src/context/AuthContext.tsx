import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { User, UserRole } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER';
  isLoadingAuth: boolean;
  switchRole: (newRole: UserRole) => Promise<void>;
  loginWithEmail: (email: string, password: string, desiredRole?: UserRole) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (requiredRole: 'ADMIN' | 'MANAGER' | 'CASHIER') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        localStorage.removeItem('volt_pos_manual_logout');
        const u = await authService.getCurrentUser();
        setUser(u);
        setIsLoadingAuth(false);
      } else {
        const isManualLogout = localStorage.getItem('volt_pos_manual_logout');
        if (!isManualLogout) {
          try {
            const autoUser = await authService.loginWithEmail('admin@voltpos.com', 'admin123', 'admin');
            setUser(autoUser);
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setIsLoadingAuth(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const switchRole = async (newRole: UserRole) => {
    const updated = await authService.switchRole(newRole);
    setUser(updated);
  };

  const loginWithEmail = async (email: string, password: string, desiredRole?: UserRole) => {
    localStorage.removeItem('volt_pos_manual_logout');
    setIsLoadingAuth(true);
    try {
      const loggedIn = await authService.loginWithEmail(email, password, desiredRole);
      setUser(loggedIn);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string, role: UserRole) => {
    localStorage.removeItem('volt_pos_manual_logout');
    setIsLoadingAuth(true);
    try {
      const newUser = await authService.signUpWithEmail(email, password, name, role);
      setUser(newUser);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const loginWithGoogle = async () => {
    localStorage.removeItem('volt_pos_manual_logout');
    setIsLoadingAuth(true);
    try {
      const loggedIn = await authService.loginWithGoogle();
      setUser(loggedIn);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async () => {
    localStorage.setItem('volt_pos_manual_logout', 'true');
    await authService.logout();
    setUser(null);
  };

  // Normalize role to uppercase ADMIN, MANAGER, CASHIER
  const rawRole = (user?.role || '').toUpperCase();
  const role: 'ADMIN' | 'MANAGER' | 'CASHIER' =
    rawRole === 'ADMIN' ? 'ADMIN' : rawRole === 'MANAGER' ? 'MANAGER' : 'CASHIER';

  const hasPermission = (requiredRole: 'ADMIN' | 'MANAGER' | 'CASHIER'): boolean => {
    if (!user) return false;
    if (role === 'ADMIN') return true;
    if (role === 'MANAGER' && (requiredRole === 'MANAGER' || requiredRole === 'CASHIER')) return true;
    if (role === 'CASHIER' && requiredRole === 'CASHIER') return true;
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoadingAuth,
        switchRole,
        loginWithEmail,
        signUpWithEmail,
        loginWithGoogle,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
