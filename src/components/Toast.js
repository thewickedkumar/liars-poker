import React, { createContext, useCallback, useContext, useState } from 'react';
import { sounds } from '../sounds';
import './Toast.css';

const ToastContext = createContext(() => {});

export const useToast = () => useContext(ToastContext);

let _id = 0;

const ICONS = {
  success: '▲',
  error:   '✕',
  info:    '›',
  warn:    '!',
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info', duration = 3200) => {
    const id = ++_id;
    setToasts((t) => [...t, { id, message, type }]);
    if (type === 'error' || type === 'warn') sounds.error();
    if (duration) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            onClick={() => dismiss(t.id)}
          >
            <span className="toast-icon">{ICONS[t.type] || ICONS.info}</span>
            <span className="toast-msg">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
