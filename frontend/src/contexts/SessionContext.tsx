import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import SessionExpiredDialog from '../components/SessionExpiredDialog';
import { authService, resetSessionExpiredFlag } from '../services/api';

interface User {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  profilePicture?: string;
  role?: string;
  bio?: string;
  contactInformation?: string;
}

interface SessionContextType {
  handleSessionExpired: () => void;
  isSessionExpired: boolean;
  user: User | null;
  setUser: (user: User | null) => void;
  updateUserData: (updatedUser: User) => void;
  firebaseReady: boolean;
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

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  // Use ref to prevent multiple calls in quick succession
  const isHandlingExpiration = useRef(false);

  // Update user and persist to localStorage
  const updateUserData = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, []);

  // Listen to Firebase auth state changes
  useEffect(() => {
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
    // Sign out of Firebase so the login page can restart the flow
    await signOut(auth);
    window.location.href = '/login';
  }, []);

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
    <SessionContext.Provider value={{ handleSessionExpired, isSessionExpired, user, setUser, updateUserData, firebaseReady }}>
      {children}
      <SessionExpiredDialog
        isOpen={isSessionExpired}
        onLogin={handleLogin}
      />
    </SessionContext.Provider>
  );
};

export default SessionContext;
