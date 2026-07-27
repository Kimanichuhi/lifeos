import { useCallback } from 'react';
import { create } from './tinyStore';
import type { Toast, ToastKind } from '../components/Toaster';

interface ToastState {
  toasts: Toast[];
  push: (kind: ToastKind, message: string, ttl?: number) => string;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (kind, message, ttl = 3500) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
    if (ttl > 0 && kind !== 'loading') {
      setTimeout(() => get().remove(id), ttl);
    }
    return id;
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function useToast() {
  const push = useToastStore((s) => s.push);
  const remove = useToastStore((s) => s.remove);
  return {
    success: useCallback((m: string) => push('success', m), [push]),
    error: useCallback((m: string) => push('error', m), [push]),
    info: useCallback((m: string) => push('info', m), [push]),
    loading: useCallback((m: string) => push('loading', m, 0), [push]),
    remove,
  };
}
