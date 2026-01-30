import React, { useEffect, useCallback } from 'react';
import { FiLogOut, FiLogIn } from 'react-icons/fi';

interface SessionExpiredDialogProps {
  isOpen: boolean;
  onLogin: () => void;
}

const SessionExpiredDialog: React.FC<SessionExpiredDialogProps> = ({
  isOpen,
  onLogin,
}) => {
  // Handle enter key to confirm
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        onLogin();
      }
    },
    [onLogin]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="session-expired-backdrop">
      <div className="session-expired-dialog" role="dialog" aria-modal="true">
        <div className="session-expired-content">
          <div className="session-expired-icon">
            <FiLogOut size={32} />
          </div>
          
          <h3 className="session-expired-title">Session Expired</h3>
          <p className="session-expired-message">
            Your session has expired due to inactivity. Please log in again to continue.
          </p>
        </div>

        <div className="session-expired-actions">
          <button
            className="session-expired-btn"
            onClick={onLogin}
            autoFocus
          >
            <FiLogIn size={18} />
            Log In Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiredDialog;
