import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Shield, Mic, Camera, MapPin, Check, X, Sparkles } from 'lucide-react';
import { requestNotificationPermission, notificationsSupported } from '@/lib/notifications';
import { useAuth } from '@/lib/auth';

const DISMISS_KEY = 'lifeos-permissions-dismissed';

export function PermissionsPrompt() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const setNotifications = useAuth((s) => s.setNotifications);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const steps = [
    {
      icon: Bell,
      title: 'Enable notifications',
      desc: 'Get your daily brief, motivation, Bible verse, and task reminders at the right moment.',
      action: async () => {
        if (notificationsSupported()) {
          const perm = await requestNotificationPermission();
          setNotifications({ enabled: perm === 'granted' });
        }
        setStep(1);
      },
    },
    {
      icon: Shield,
      title: 'Biometric unlock',
      desc: 'Use your fingerprint or face to unlock Life OS instantly without typing your PIN each time.',
      action: () => setStep(2),
      optional: true,
    },
    {
      icon: Mic,
      title: 'Microphone access',
      desc: 'Enables voice journaling and voice commands to your AI assistant.',
      action: async () => {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch { /* user may decline */ }
        setStep(3);
      },
      optional: true,
    },
    {
      icon: Camera,
      title: 'Camera access',
      desc: 'Lets you scan documents and capture photos directly into your journal or vault.',
      action: async () => {
        try {
          await navigator.mediaDevices.getUserMedia({ video: true });
        } catch { /* user may decline */ }
        setStep(4);
      },
      optional: true,
    },
    {
      icon: MapPin,
      title: 'Location access',
      desc: 'Tag journal entries and timeline events with your location for richer memories.',
      action: async () => {
        try {
          await navigator.geolocation.getCurrentPosition(() => {});
        } catch { /* user may decline */ }
        finish();
      },
      optional: true,
    },
  ];

  function finish() {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, '1');
  }

  function skip() {
    if (step < steps.length - 1) setStep(step + 1);
    else finish();
  }

  const current = steps[step];
  if (!current) return null;
  const Icon = current.icon;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-4 sm:p-6"
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={skip} />
          <motion.div
            initial={{ scale: 0.96, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-md card p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-accent-500">
                <Sparkles size={16} />
                <span className="text-xs font-semibold uppercase tracking-wider">Set up Life OS</span>
              </div>
              <span className="text-xs text-slate-400">{step + 1} / {steps.length}</span>
            </div>

            <div className="size-14 rounded-2xl bg-accent-500/10 text-accent-500 grid place-items-center mx-auto mb-4">
              <Icon size={26} />
            </div>

            <h3 className="font-display font-bold text-lg text-center mb-2">{current.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">{current.desc}</p>

            <div className="flex gap-2">
              <button onClick={current.action} className="btn-primary flex-1">
                <Check size={16} /> Allow
              </button>
              {current.optional && (
                <button onClick={skip} className="btn-ghost">
                  <X size={16} /> Skip
                </button>
              )}
            </div>

            <div className="flex justify-center gap-1.5 mt-5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all ${i === step ? 'w-6 bg-accent-500' : i < step ? 'w-2 bg-accent-500/50' : 'w-2 bg-slate-200 dark:bg-slate-700'}`}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
