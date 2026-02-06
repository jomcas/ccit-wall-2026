import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import SessionExpiredDialog from '../components/SessionExpiredDialog';
import { resetSessionExpiredFlag } from '../services/api';

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

  const handleSessionExpired = useCallback(() => {
    // Prevent multiple calls
    if (isHandlingExpiration.current || isSessionExpired) {
      return;
    }
    
    isHandlingExpiration.current = true;
    
    // Immediately clear auth data to stop any further authenticated requests
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    
    // Show the dialog
    setIsSessionExpired(true);
  }, [isSessionExpired]);

  const handleLogin = useCallback(() => {
    // Reset the handling flag
    isHandlingExpiration.current = false;
    
    // Reset the API session expired flag so requests work again
    resetSessionExpiredFlag();
    
    // Close dialog
    setIsSessionExpired(false);
    
    // Navigate to login and reload to ensure clean state
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
    <SessionContext.Provider value={{ handleSessionExpired, isSessionExpired, user, setUser, updateUserData }}>
      {children}
      <SessionExpiredDialog
        isOpen={isSessionExpired}
        onLogin={handleLogin}
      />
    </SessionContext.Provider>
  );
};

export default SessionContext;
