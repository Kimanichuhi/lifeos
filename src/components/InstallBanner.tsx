import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { Logo } from '@/components/Logo';

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'lifeos-install-dismissed';

export function InstallBanner() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      if (!localStorage.getItem(DISMISS_KEY)) setShow(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setShow(false);
    };
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
  }

  function dismiss() {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, '1');
  }

  return (
    <AnimatePresence>
      {show && !installed && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-96 z-50"
        >
          <div className="card p-4 shadow-2xl border-accent-500/30">
            <div className="flex items-start gap-3">
              <Logo className="size-11 rounded-xl shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-sm">Install Life OS</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Add to your home screen for a full-screen app experience with offline access and notifications.
                </p>
                <div className="flex gap-2 mt-3">
                  <button onClick={install} className="btn-primary !py-1.5 !text-xs">
                    <Download size={14} /> Install
                  </button>
                  <button onClick={dismiss} className="btn-ghost !py-1.5 !text-xs">
                    Not now
                  </button>
                </div>
              </div>
              <button onClick={dismiss} className="text-slate-400 hover:text-slate-600 shrink-0">
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
