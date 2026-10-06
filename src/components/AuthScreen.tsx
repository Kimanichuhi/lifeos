import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ShieldCheck, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/Logo';

export function AuthScreen() {
  const signIn = useAuth((s) => s.signIn);
  const busy = useAuth((s) => s.busy);
  const error = useAuth((s) => s.error);
  const clearError = useAuth((s) => s.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    const ok = await signIn(email, password);
    if (ok) setPassword('');
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 size-96 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-accent-500/5 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 size-64 rounded-full bg-accent-400/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05, type: 'spring', stiffness: 260, damping: 20 }}
          className="mx-auto mb-5 w-fit"
        >
          <Logo className="size-16 sm:size-20 rounded-2xl shadow-glow" />
        </motion.div>

        <div className="card p-7 sm:p-8 shadow-lift dark:shadow-lift-dark">
          <h1 className="font-display font-bold text-3xl text-center mb-1 bg-gradient-to-br from-accent-600 to-accent-400 dark:from-accent-300 dark:to-accent-500 bg-clip-text text-transparent">
            Life OS
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-7">
            Sign in to your Life OS
          </p>

          <form onSubmit={submit} className="space-y-3">
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => { clearError(); setEmail(e.target.value); }}
                placeholder="Email"
                className="input !py-3 pl-10"
                required
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => { clearError(); setPassword(e.target.value); }}
                placeholder="Password"
                className="input !py-3 pl-10 pr-10"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3.5 py-2.5 text-sm font-medium overflow-hidden"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" disabled={busy || !email || !password} className="btn-primary w-full !py-3 mt-2">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={15} />}
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-400">
          <ShieldCheck size={13} className="shrink-0" />
          <span>Your password is never stored — it only unlocks your vault locally.</span>
        </div>
      </motion.div>
    </div>
  );
}
