import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast: addToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none">
        {toasts.map((toast) => {
          let bg = 'bg-slate-900 text-white';
          let icon = <Info className="w-5 h-5 text-blue-400" />;

          if (toast.type === 'success') {
            bg = 'bg-emerald-900 border border-emerald-700 text-emerald-50';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
          } else if (toast.type === 'error') {
            bg = 'bg-rose-900 border border-rose-700 text-rose-50';
            icon = <AlertCircle className="w-5 h-5 text-rose-400" />;
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center shadow-xl rounded-xl px-4 py-3 min-w-[280px] max-w-md transition-all transform ease-out duration-200 ${bg}`}
            >
              <span className="mr-3 flex-shrink-0">{icon}</span>
              <p className="text-sm font-medium flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-3 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
