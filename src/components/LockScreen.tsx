import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Delete, Fingerprint, ShieldCheck, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function LockScreen() {
  const status = useAuth((s) => s.status);
  if (status === 'setup') return <SetupFlow />;
  return <UnlockScreen />;
}

function SetupFlow() {
  const setupPin = useAuth((s) => s.setupPin);
  const error = useAuth((s) => s.error);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [stage, setStage] = useState<'create' | 'confirm'>('create');
  const biometricAvailable = useAuth((s) => s.biometricAvailable);
  const setBiometricPreferred = useAuth((s) => s.setBiometricPreferred);

  function press(d: string) {
    if (stage === 'create' && pin.length < 6) setPin((p) => p + d);
    if (stage === 'confirm' && confirm.length < 6) setConfirm((p) => p + d);
  }

  function del() {
    if (stage === 'create') setPin((p) => p.slice(0, -1));
    else setConfirm((p) => p.slice(0, -1));
  }

  async function submit() {
    if (stage === 'create') {
      if (pin.length === 6) setStage('confirm');
    } else {
      if (confirm === pin) {
        if (biometricAvailable) setBiometricPreferred(true);
        await setupPin(pin);
      }
    }
  }

  const value = stage === 'create' ? pin : confirm;

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
        <h1 className="font-display font-bold text-2xl text-center mb-1">Welcome to Life OS</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8">
          {stage === 'create'
            ? 'Create a 6-digit PIN to secure your Life OS. This PIN also encrypts your vault.'
            : 'Re-enter your PIN to confirm.'}
        </p>

        <PinDots length={value.length} />

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-rose-500 text-sm text-center mt-4"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {stage === 'confirm' && confirm !== pin && confirm.length === 6 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-rose-500 text-sm text-center mt-4"
          >
            PINs do not match. Try again.
          </motion.p>
        )}

        <Keypad onPress={press} onDelete={del} onSubmit={submit} submitDisabled={value.length !== 6} />

        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-400">
          <ShieldCheck size={13} />
          <span>Your PIN is encrypted and never leaves this device.</span>
        </div>
      </motion.div>
    </div>
  );
}

function UnlockScreen() {
  const unlock = useAuth((s) => s.unlock);
  const unlockWithBiometric = useAuth((s) => s.unlockWithBiometric);
  const error = useAuth((s) => s.error);
  const clearError = useAuth((s) => s.clearError);
  const biometricAvailable = useAuth((s) => s.biometricAvailable);
  const biometricPreferred = useAuth((s) => s.biometricPreferred);
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);

  function press(d: string) {
    clearError();
    if (pin.length < 6) setPin((p) => p + d);
  }
  function del() {
    clearError();
    setPin((p) => p.slice(0, -1));
  }
  async function submit() {
    if (pin.length !== 6) return;
    const ok = await unlock(pin);
    if (!ok) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin('');
    }
  }

  useEffect(() => {
    if (biometricPreferred) {
      unlockWithBiometric();
    }
  }, [biometricPreferred]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 size-96 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-accent-500/5 blur-3xl" />
      </div>

      <motion.div
        animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-sm"
      >
        <div className="size-16 rounded-2xl bg-accent-600 text-white grid place-items-center mx-auto mb-5 shadow-glow">
          <Lock size={28} />
        </div>
        <h1 className="font-display font-bold text-2xl text-center mb-1">Life OS</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8">
          Enter your 6-digit PIN to unlock
        </p>

        <PinDots length={pin.length} />

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-rose-500 text-sm text-center mt-4"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <Keypad
          onPress={press}
          onDelete={del}
          onSubmit={submit}
          submitDisabled={pin.length !== 6}
          biometric={biometricAvailable && biometricPreferred}
          onBiometric={unlockWithBiometric}
        />
      </motion.div>
    </div>
  );
}

function PinDots({ length }: { length: number }) {
  return (
    <div className="flex justify-center gap-4 mb-8">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ scale: i < length ? 1 : 0.85 }}
          className={`size-3.5 rounded-full transition-colors ${
            i < length ? 'bg-accent-500' : 'bg-slate-200 dark:bg-slate-700'
          }`}
        />
      ))}
    </div>
  );
}

function Keypad({
  onPress, onDelete, onSubmit, submitDisabled, biometric, onBiometric,
}: {
  onPress: (d: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
  submitDisabled: boolean;
  biometric?: boolean;
  onBiometric?: () => void;
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  return (
    <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
      {keys.map((k) => (
        <KeypadButton key={k} onClick={() => onPress(k)}>{k}</KeypadButton>
      ))}
      {biometric ? (
        <KeypadButton onClick={onBiometric} special>
          <Fingerprint size={24} />
        </KeypadButton>
      ) : (
        <div />
      )}
      <KeypadButton onClick={() => onPress('0')}>0</KeypadButton>
      <KeypadButton onClick={onDelete} special>
        <Delete size={22} />
      </KeypadButton>
      <KeypadButton onClick={onSubmit} disabled={submitDisabled} submit>
        OK
      </KeypadButton>
    </div>
  );
}

function KeypadButton({
  children, onClick, special, submit, disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  special?: boolean;
  submit?: boolean;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      disabled={disabled}
      className={`h-16 rounded-2xl font-display font-semibold text-xl transition
        ${submit
          ? 'bg-accent-600 text-white hover:bg-accent-500 disabled:opacity-30'
          : special
            ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
            : 'bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-soft'
        }`}
    >
      {children}
    </motion.button>
  );
}
