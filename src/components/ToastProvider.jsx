import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
        const context = useContext(ToastContext);
        if (!context) {
                throw new Error('useToast must be used within a ToastProvider');
        }
        return context;
};

const TOAST_TYPES = {
        success: {
                icon: CheckCircle2,
                iconClass: 'text-emerald-400',
                borderClass: 'border-l-emerald-500',
                bgClass: 'bg-emerald-500/10'
        },
        error: {
                icon: AlertCircle,
                iconClass: 'text-red-400',
                borderClass: 'border-l-red-500',
                bgClass: 'bg-red-500/10'
        },
        warning: {
                icon: AlertTriangle,
                iconClass: 'text-amber-400',
                borderClass: 'border-l-amber-500',
                bgClass: 'bg-amber-500/10'
        },
        info: {
                icon: Info,
                iconClass: 'text-blue-400',
                borderClass: 'border-l-blue-500',
                bgClass: 'bg-blue-500/10'
        }
};

const Toast = ({ id, type, title, message, onClose }) => {
        const config = TOAST_TYPES[type] || TOAST_TYPES.info;
        const Icon = config.icon;

        return (
                <div
                        className={`
        flex items-start gap-3 p-4 rounded-xl border-l-4 ${config.borderClass} ${config.bgClass}
        bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 shadow-2xl
        animate-slide-in-right min-w-[320px] max-w-[420px]
      `}
                >
                        <Icon className={`w-5 h-5 ${config.iconClass} shrink-0 mt-0.5`} />
                        <div className="flex-1 min-w-0">
                                {title && (
                                        <p className="text-white font-semibold text-sm mb-0.5">{title}</p>
                                )}
                                {message && (
                                        <p className="text-zinc-400 text-xs leading-relaxed">{message}</p>
                                )}
                        </div>
                        <button
                                onClick={() => onClose(id)}
                                className="p-1 hover:bg-zinc-700/50 rounded-lg transition-colors shrink-0"
                        >
                                <X className="w-4 h-4 text-zinc-400" />
                        </button>
                </div>
        );
};

export const ToastProvider = ({ children }) => {
        const [toasts, setToasts] = useState([]);

        const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
                const id = Date.now() + Math.random();

                setToasts(prev => [...prev, { id, type, title, message }]);

                if (duration > 0) {
                        setTimeout(() => {
                                removeToast(id);
                        }, duration);
                }

                return id;
        }, []);

        const removeToast = useCallback((id) => {
                setToasts(prev => prev.filter(toast => toast.id !== id));
        }, []);

        const toast = {
                success: (title, message) => addToast({ type: 'success', title, message }),
                error: (title, message) => addToast({ type: 'error', title, message }),
                warning: (title, message) => addToast({ type: 'warning', title, message }),
                info: (title, message) => addToast({ type: 'info', title, message }),
                custom: addToast,
                dismiss: removeToast
        };

        return (
                <ToastContext.Provider value={toast}>
                        {children}

                        {/* Toast Container */}
                        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3">
                                {toasts.map(t => (
                                        <Toast
                                                key={t.id}
                                                {...t}
                                                onClose={removeToast}
                                        />
                                ))}
                        </div>

                        {/* Animation Styles */}
                        <style>{`
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out forwards;
        }
      `}</style>
                </ToastContext.Provider>
        );
};

export default ToastProvider;
