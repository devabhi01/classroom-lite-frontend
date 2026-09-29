import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();

  subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  add(toast: Omit<ToastItem, 'id'>) {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = { ...toast, id };
    this.toasts = [...this.toasts, newToast];
    this.notify();

    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }

    return id;
  }

  remove(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  success(message: string, title?: string) {
    return this.add({ type: 'success', message, title });
  }

  error(message: string, title?: string) {
    return this.add({ type: 'error', message, title });
  }

  info(message: string, title?: string) {
    return this.add({ type: 'info', message, title });
  }

  warning(message: string, title?: string) {
    return this.add({ type: 'warning', message, title });
  }
}

export const toast = new ToastManager();

export const Toaster: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2',
            t.type === 'success' && 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-100',
            t.type === 'error' && 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-100',
            t.type === 'warning' && 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-100',
            t.type === 'info' && 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100'
          )}
        >
          <div className="shrink-0 mt-0.5">
            {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
            {t.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />}
            {t.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
            {t.type === 'info' && <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
          </div>
          <div className="flex-1 text-sm">
            {t.title && <div className="font-semibold mb-0.5">{t.title}</div>}
            <div className="text-xs sm:text-sm leading-snug">{t.message}</div>
          </div>
          <button
            onClick={() => toast.remove(t.id)}
            className="shrink-0 rounded p-1 hover:opacity-75 transition-opacity"
            aria-label="Dismiss toast"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
