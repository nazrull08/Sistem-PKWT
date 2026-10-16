import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastMessageData, ToastPopup, ToastType } from '../components/ToastPopup';

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message: string, duration?: number) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessageData[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message: string, duration = 5000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastMessageData = {
        id,
        type,
        title,
        message,
        duration
      };

      setToasts((prev) => {
        // Keep at most 3 toasts on screen to prevent clutter
        const filtered = prev.slice(-2);
        return [...filtered, newToast];
      });
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <ToastPopup toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
