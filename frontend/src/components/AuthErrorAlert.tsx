import React from 'react';
import { FiAlertCircle, FiX, FiAlertTriangle, FiInfo } from 'react-icons/fi';

export interface FieldError {
  field: string;
  message: string;
}

export interface AuthError {
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  fieldErrors?: FieldError[];
  suggestion?: string;
}

interface AuthErrorAlertProps {
  error: AuthError | null;
  onDismiss?: () => void;
}

const AuthErrorAlert: React.FC<AuthErrorAlertProps> = ({ error, onDismiss }) => {
  if (!error) return null;

  const getIcon = () => {
    switch (error.type) {
      case 'warning':
        return <FiAlertTriangle size={20} />;
      case 'info':
        return <FiInfo size={20} />;
      default:
        return <FiAlertCircle size={20} />;
    }
  };

  return (
    <div className={`auth-error-alert auth-error-alert--${error.type}`}>
      <div className="auth-error-alert__header">
        <div className="auth-error-alert__icon">
          {getIcon()}
        </div>
        <div className="auth-error-alert__content">
          <h4 className="auth-error-alert__title">{error.title}</h4>
          <p className="auth-error-alert__message">{error.message}</p>
        </div>
        {onDismiss && (
          <button 
            className="auth-error-alert__dismiss" 
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            <FiX size={18} />
          </button>
        )}
      </div>
      
      {error.fieldErrors && error.fieldErrors.length > 0 && (
        <ul className="auth-error-alert__field-errors">
          {error.fieldErrors.map((fieldError, index) => (
            <li key={index} className="auth-error-alert__field-error">
              <span className="auth-error-alert__field-name">{fieldError.field}:</span>
              <span className="auth-error-alert__field-message">{fieldError.message}</span>
            </li>
          ))}
        </ul>
      )}
      
      {error.suggestion && (
        <p className="auth-error-alert__suggestion">
          <FiInfo size={14} />
          <span>{error.suggestion}</span>
        </p>
      )}
    </div>
  );
};

// Helper function to parse API errors into AuthError format
export const parseAuthError = (err: any, context: 'login' | 'register'): AuthError => {
  // Handle validation errors (array format from express-validator)
  if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
    const fieldErrors: FieldError[] = err.response.data.errors.map((e: any) => ({
      field: formatFieldName(e.path || e.param || 'Field'),
      message: e.msg || e.message || 'Invalid value',
    }));

    return {
      type: 'error',
      title: 'Validation Error',
      message: 'Please fix the following issues:',
      fieldErrors,
      suggestion: context === 'register' 
        ? 'Make sure all fields meet the requirements below.'
        : undefined,
    };
  }

  // Handle specific error messages from backend
  const message = err.response?.data?.message || '';
  const status = err.response?.status;

  // Login-specific errors
  if (context === 'login') {
    if (status === 401 || message.toLowerCase().includes('invalid')) {
      return {
        type: 'error',
        title: 'Invalid Credentials',
        message: 'The email or password you entered is incorrect.',
        suggestion: 'Please check your credentials and try again. If you forgot your password, use the "Forgot Password" link below.',
      };
    }
  }

  // Registration-specific errors
  if (context === 'register') {
    if (message.toLowerCase().includes('registration failed') || message.toLowerCase().includes('already')) {
      return {
        type: 'error',
        title: 'Registration Failed',
        message: 'Unable to create your account. This email may already be registered.',
        suggestion: 'Try signing in instead, or use a different email address.',
      };
    }
  }

  // Network errors
  if (!err.response) {
    return {
      type: 'error',
      title: 'Connection Error',
      message: 'Unable to connect to the server. Please check your internet connection.',
      suggestion: 'Make sure you have an active internet connection and try again.',
    };
  }

  // Rate limiting
  if (status === 429) {
    return {
      type: 'warning',
      title: 'Too Many Attempts',
      message: 'You\'ve made too many requests. Please wait a moment before trying again.',
      suggestion: 'For security reasons, we limit the number of login attempts. Try again in a few minutes.',
    };
  }

  // Server errors
  if (status >= 500) {
    return {
      type: 'error',
      title: 'Server Error',
      message: 'Something went wrong on our end. Please try again later.',
      suggestion: 'If this problem persists, please contact support.',
    };
  }

  // Generic fallback
  return {
    type: 'error',
    title: context === 'login' ? 'Login Failed' : 'Registration Failed',
    message: message || `An unexpected error occurred during ${context}.`,
    suggestion: 'Please try again. If the problem persists, contact support.',
  };
};

// Helper to format field names for display
const formatFieldName = (field: string): string => {
  const fieldMap: Record<string, string> = {
    name: 'Name',
    email: 'Email',
    password: 'Password',
    role: 'Role',
    confirmPassword: 'Confirm Password',
  };
  return fieldMap[field] || field.charAt(0).toUpperCase() + field.slice(1);
};

export default AuthErrorAlert;
