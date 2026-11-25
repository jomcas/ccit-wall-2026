import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import SessionExpiredDialog from '../components/SessionExpiredDialog';
import { authService, IS_MOCK_MODE, resetSessionExpiredFlag } from '../services/api';
import {
  getActiveMockUser,
  setActiveMockUserByRole,
  loginOrCreateMockUser,
} from '../services/mockApi';
import { cache } from '../utils/cache';
import type { User } from '../types';

const MOCK_SIGNED_OUT_KEY = 'ccit_mock_signed_out';

interface SessionContextType {
  handleSessionExpired: () => void;
  isSessionExpired: boolean;
  user: User | null;
  setUser: (user: User | null) => void;
  updateUserData: (updatedUser: User) => void;
  firebaseReady: boolean;
  isMockMode: boolean;
  loginMockUser: (
    email?: string,
    role?: 'student' | 'teacher' | 'admin',
    name?: string
  ) => User;
  logoutMockUser: () => void;
  switchMockRole: (role: 'student' | 'teacher' | 'admin') => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

interface SessionProviderProps {
  children: React.ReactNode;
}

function getInitialUser(): User | null {
  if (IS_MOCK_MODE) {
    try {
      if (localStorage.getItem(MOCK_SIGNED_OUT_KEY) === 'true') {
        return null;
      }
    } catch {
      // Ignore storage access errors
    }
    const mockUser = getActiveMockUser();
    try {
      localStorage.setItem('user', JSON.stringify(mockUser));
    } catch {
      // Ignore storage access errors
    }
    return mockUser;
  }

  try {
    const stored = localStorage.getItem('user');
    return stored ? (JSON.parse(stored) as User) : null;
  } catch {
    return null;
  }
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(IS_MOCK_MODE);
  const [user, setUser] = useState<User | null>(getInitialUser);

  // Use ref to prevent multiple calls in quick succession
  const isHandlingExpiration = useRef(false);

  // Update user and persist to localStorage
  const updateUserData = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    try {
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch {
      // Ignore storage access errors
    }
  }, []);

  // Mock auth actions
  const loginMockUser = useCallback(
    (email?: string, role?: 'student' | 'teacher' | 'admin', name?: string): User => {
      const nextUser = loginOrCreateMockUser(email, role, name);
      try {
        localStorage.removeItem(MOCK_SIGNED_OUT_KEY);
        localStorage.setItem('user', JSON.stringify(nextUser));
      } catch {
        // Ignore storage access errors
      }
      cache.invalidateByPrefix('');
      resetSessionExpiredFlag();
      setIsSessionExpired(false);
      setUser(nextUser);
      return nextUser;
    },
    []
  );

  const logoutMockUser = useCallback(() => {
    try {
      localStorage.setItem(MOCK_SIGNED_OUT_KEY, 'true');
      localStorage.removeItem('user');
    } catch {
      // Ignore storage access errors
    }
    cache.invalidateByPrefix('');
    setUser(null);
  }, []);

  const switchMockRole = useCallback((role: 'student' | 'teacher' | 'admin') => {
    const nextUser = setActiveMockUserByRole(role);
    try {
      localStorage.removeItem(MOCK_SIGNED_OUT_KEY);
      localStorage.setItem('user', JSON.stringify(nextUser));
    } catch {
      // Ignore storage access errors
    }
    cache.invalidateByPrefix('');
    setUser(nextUser);
  }, []);

  // Listen to Firebase auth state changes (disabled in mock mode)
  useEffect(() => {
    if (IS_MOCK_MODE) {
      setFirebaseReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in — sync with backend to get Mongo user data
        try {
          // Retrieve pending role (set during registration)
          const pendingRole = localStorage.getItem('pendingRole');
          const syncData: { role?: string; name?: string } = {};
          if (pendingRole) {
            syncData.role = pendingRole;
            localStorage.removeItem('pendingRole');
          }
          if (firebaseUser.displayName) {
            syncData.name = firebaseUser.displayName;
          }
          const res = await authService.syncProfile(syncData);
          const mongoUser = res.data.user;
          setUser(mongoUser);
          localStorage.setItem('user', JSON.stringify(mongoUser));
          resetSessionExpiredFlag();
        } catch {
          // Sync failed — sign out
          await signOut(auth);
          setUser(null);
          localStorage.removeItem('user');
        }
      } else {
        // User is signed out
        setUser(null);
        localStorage.removeItem('user');
      }
      setFirebaseReady(true);
    });

    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSessionExpired = useCallback(() => {
    if (isHandlingExpiration.current || isSessionExpired) return;
    isHandlingExpiration.current = true;

    localStorage.removeItem('user');
    setUser(null);
    setIsSessionExpired(true);
  }, [isSessionExpired]);

  const handleLogin = useCallback(async () => {
    isHandlingExpiration.current = false;
    resetSessionExpiredFlag();
    setIsSessionExpired(false);
    if (IS_MOCK_MODE) {
      logoutMockUser();
    } else {
      // Sign out of Firebase so the login page can restart the flow
      await signOut(auth);
    }
    window.location.href = '/login';
  }, [logoutMockUser]);

  // Listen for localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        if (e.newValue) {
          setUser(JSON.parse(e.newValue));
        } else {
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        handleSessionExpired,
        isSessionExpired,
        user,
        setUser,
        updateUserData,
        firebaseReady,
        isMockMode: IS_MOCK_MODE,
        loginMockUser,
        logoutMockUser,
        switchMockRole,
      }}
    >
      {children}
      <SessionExpiredDialog
        isOpen={isSessionExpired}
        onLogin={handleLogin}
      />
    </SessionContext.Provider>
  );
};

export default SessionContext;
