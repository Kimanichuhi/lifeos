import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Loader2, AlertCircle, Info } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info' | 'loading';
export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastProps {
  toasts: Toast[];
  remove: (id: string) => void;
}

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  loading: Loader2,
};

const COLORS = {
  success: 'text-emerald-500',
  error: 'text-rose-500',
  info: 'text-accent-500',
  loading: 'text-accent-500',
};

export function Toaster({ toasts, remove }: ToastProps) {
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 w-80">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="card px-4 py-3 flex items-center gap-3 shadow-lg"
            >
              <Icon size={18} className={`${COLORS[t.kind]} ${t.kind === 'loading' ? 'animate-spin' : ''}`} />
              <span className="text-sm flex-1">{t.message}</span>
              <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs">
                Dismiss
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
