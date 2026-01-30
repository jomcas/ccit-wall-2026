import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SessionExpiredDialog from '../components/SessionExpiredDialog';

interface SessionContextType {
  handleSessionExpired: () => void;
  isSessionExpired: boolean;
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
  const navigate = useNavigate();
  // Use ref to prevent multiple calls in quick succession
  const isHandlingExpiration = useRef(false);

  const handleSessionExpired = useCallback(() => {
    // Prevent multiple calls
    if (isHandlingExpiration.current || isSessionExpired) {
      return;
    }
    
    isHandlingExpiration.current = true;
    
    // Immediately clear auth data to stop any further authenticated requests
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Show the dialog
    setIsSessionExpired(true);
  }, [isSessionExpired]);

  const handleLogin = useCallback(() => {
    // Reset the handling flag
    isHandlingExpiration.current = false;
    
    // Close dialog
    setIsSessionExpired(false);
    
    // Navigate to login
    navigate('/login');
  }, [navigate]);

  return (
    <SessionContext.Provider value={{ handleSessionExpired, isSessionExpired }}>
      {children}
      <SessionExpiredDialog
        isOpen={isSessionExpired}
        onLogin={handleLogin}
      />
    </SessionContext.Provider>
  );
};

export default SessionContext;
