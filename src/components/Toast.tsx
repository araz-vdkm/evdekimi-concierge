import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
  /** Auto-dismiss after this many ms. Pass 0 to require manual close only. */
  durationMs?: number;
}

/**
 * Small floating status notification, top-right of the screen, with a manual
 * close (X) button. Used to confirm actions like deletes so the user gets
 * clear feedback beyond just the row disappearing from the list.
 */
export default function Toast({ message, type = 'info', onClose, durationMs = 5000 }: ToastProps) {
  useEffect(() => {
    if (!durationMs) return;
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [message, type, durationMs, onClose]);

  const styles =
    type === 'error'
      ? 'bg-rose-900 text-white border-rose-700'
      : type === 'success'
      ? 'bg-emerald-900 text-white border-emerald-700'
      : 'bg-slate-900 text-white border-slate-700';

  return (
    <div className="fixed top-6 right-6 z-[200] animate-in slide-in-from-top-5 duration-200">
      <div className={`pl-4 pr-3 py-3 rounded-xl shadow-lg border flex items-center gap-3 text-sm font-semibold max-w-sm ${styles}`}>
        {type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
        {type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
        {type === 'info' && <Info className="w-4 h-4 text-indigo-400 shrink-0" />}
        <span className="flex-1">{message}</span>
        <button
          onClick={onClose}
          className="p-1 -mr-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
