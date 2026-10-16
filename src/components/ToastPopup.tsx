import React, { useEffect, useState } from 'react';
import { CheckCircle2, Trash2, Edit3, AlertTriangle, X, Info } from 'lucide-react';

export type ToastType = 'success' | 'edit' | 'delete' | 'error' | 'info';

export interface ToastMessageData {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number; // in ms, defaults to 5000
}

interface ToastPopupProps {
  toasts: ToastMessageData[];
  onDismiss: (id: string) => void;
}

export const ToastPopup: React.FC<ToastPopupProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessageData; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss
}) => {
  const duration = toast.duration || 5000;
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // 5 seconds auto-dismiss
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    // Progress bar animation interval (updates every 50ms)
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPercent = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remainingPercent);
      if (remainingPercent <= 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [toast.id, duration, onDismiss]);

  const config = {
    success: {
      bg: 'bg-white',
      border: 'border-emerald-500/30',
      shadow: 'shadow-emerald-500/10',
      iconBg: 'bg-emerald-100 text-emerald-600',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
      progressBar: 'bg-emerald-500',
      titleColor: 'text-emerald-950'
    },
    edit: {
      bg: 'bg-white',
      border: 'border-blue-500/30',
      shadow: 'shadow-blue-500/10',
      iconBg: 'bg-blue-100 text-blue-600',
      icon: <Edit3 className="w-5 h-5 text-blue-600 shrink-0" />,
      progressBar: 'bg-blue-500',
      titleColor: 'text-blue-950'
    },
    delete: {
      bg: 'bg-white',
      border: 'border-rose-500/30',
      shadow: 'shadow-rose-500/10',
      iconBg: 'bg-rose-100 text-rose-600',
      icon: <Trash2 className="w-5 h-5 text-rose-600 shrink-0" />,
      progressBar: 'bg-rose-500',
      titleColor: 'text-rose-950'
    },
    error: {
      bg: 'bg-white',
      border: 'border-amber-500/30',
      shadow: 'shadow-amber-500/10',
      iconBg: 'bg-amber-100 text-amber-600',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
      progressBar: 'bg-amber-500',
      titleColor: 'text-amber-950'
    },
    info: {
      bg: 'bg-white',
      border: 'border-indigo-500/30',
      shadow: 'shadow-indigo-500/10',
      iconBg: 'bg-indigo-100 text-indigo-600',
      icon: <Info className="w-5 h-5 text-indigo-600 shrink-0" />,
      progressBar: 'bg-indigo-500',
      titleColor: 'text-indigo-950'
    }
  }[toast.type];

  return (
    <div
      role="alert"
      className={`pointer-events-auto w-full relative overflow-hidden rounded-xl border ${config.border} ${config.bg} shadow-xl ${config.shadow} p-3.5 flex items-start gap-3 transition-all duration-300 transform translate-y-0 opacity-100 animate-in slide-in-from-top-3 fade-in duration-200 select-none`}
    >
      {/* Icon */}
      <div className={`p-2 rounded-lg shrink-0 ${config.iconBg}`}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center justify-between">
          <h4 className={`text-xs font-bold ${config.titleColor} tracking-tight`}>
            {toast.title}
          </h4>
          <span className="text-[10px] text-gray-400 font-mono ml-2 shrink-0">
            5s
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed break-words font-medium">
          {toast.message}
        </p>
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Tutup notifikasi"
        className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>

      {/* 5-second countdown progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100 overflow-hidden">
        <div
          className={`h-full ${config.progressBar} transition-all ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
