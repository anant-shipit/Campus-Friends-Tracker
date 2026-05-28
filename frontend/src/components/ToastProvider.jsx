import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const addToast = useCallback(
    (message, type = 'info', duration = 3000) => {
      const id = ++toastIdCounter;
      setToasts((prev) => [...prev, { id, message, type, exiting: false }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
      return id;
    },
    [removeToast]
  );

  const success = useCallback(
    (msg) => addToast(msg, 'success'),
    [addToast]
  );

  const error = useCallback(
    (msg) => addToast(msg, 'error', 5000),
    [addToast]
  );

  const info = useCallback(
    (msg) => addToast(msg, 'info'),
    [addToast]
  );

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type} ${toast.exiting ? 'exiting' : ''}`}
            onClick={() => removeToast(toast.id)}
            role="alert"
          >
            <span className="toast-icon">{icons[toast.type]}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  const showToast = (message, type = 'info') => {
    if (type === 'success') return ctx.success(message);
    if (type === 'error') return ctx.error(message);
    return ctx.info(message);
  };
  return { ...ctx, showToast };
}
