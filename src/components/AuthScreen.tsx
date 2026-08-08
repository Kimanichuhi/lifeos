import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ShieldCheck, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';

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
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-sm"
      >
        <div className="size-16 rounded-2xl bg-accent-600 text-white grid place-items-center mx-auto mb-5 shadow-glow">
          <Sparkles size={28} />
        </div>
        <h1 className="font-display font-bold text-2xl text-center mb-1">Life OS</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8">
          Sign in to your Life OS
        </p>

        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { clearError(); setEmail(e.target.value); }}
              placeholder="Email"
              className="input pl-10"
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
              className="input pl-10 pr-10"
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-rose-500 text-sm text-center"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button type="submit" disabled={busy || !email || !password} className="btn-primary w-full !py-3 mt-2">
            {busy ? 'Please wait…' : 'Sign in'}
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-400">
          <ShieldCheck size={13} />
          <span>Your password is never stored — it only unlocks your vault locally.</span>
        </div>
      </motion.div>
    </div>
  );
}
