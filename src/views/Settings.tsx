import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Plus, Trash2, Pencil, Sparkles, Sun, Moon, Monitor, Check, X, Shield, Bell, Fingerprint, Lock, KeyRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createMemory, deleteMemory, getMemories, updateMemory } from '@/lib/api';
import { useSettings, type AccentName, type ThemeMode } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { requestNotificationPermission, notificationsSupported, sendDailyBrief, sendEveningReflection, sendMotivation, sendBibleVerse, sendTaskReminder, sendPrayerReminder } from '@/lib/notifications';
import { Modal } from '@/components/Modal';
import type { AiMemory } from '@/lib/types';

const ACCENTS: { name: AccentName; color: string }[] = [
  { name: 'blue', color: 'rgb(90 108 236)' },
  { name: 'emerald', color: 'rgb(16 185 129)' },
  { name: 'violet', color: 'rgb(139 92 246)' },
  { name: 'amber', color: 'rgb(245 158 11)' },
  { name: 'rose', color: 'rgb(244 63 94)' },
  { name: 'cyan', color: 'rgb(6 182 212)' },
];

const THEMES: { mode: ThemeMode; icon: LucideIcon; label: string }[] = [
  { mode: 'light', icon: Sun, label: 'Light' },
  { mode: 'dark', icon: Moon, label: 'Dark' },
  { mode: 'system', icon: Monitor, label: 'System' },
];

export function Settings() {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const accent = useSettings((s) => s.accent);
  const setAccent = useSettings((s) => s.setAccent);
  const [memories, setMemories] = useState<AiMemory[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<AiMemory | null>(null);
  const toast = useToast();

  const authStatus = useAuth((s) => s.status);
  const lock = useAuth((s) => s.lock);
  const biometricAvailable = useAuth((s) => s.biometricAvailable);
  const biometricPreferred = useAuth((s) => s.biometricPreferred);
  const setBiometricPreferred = useAuth((s) => s.setBiometricPreferred);
  const notifications = useAuth((s) => s.notifications);
  const setNotifications = useAuth((s) => s.setNotifications);
  const [showPinChange, setShowPinChange] = useState(false);

  useEffect(() => {
    loadMemories();
  }, []);

  async function loadMemories() {
    const { data } = await getMemories();
    if (data) setMemories(data as AiMemory[]);
  }

  async function remove(id: string) {
    await deleteMemory(id);
    loadMemories();
    toast.success('Memory deleted');
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="font-display font-bold text-2xl">Settings</h2>
        <p className="text-sm text-slate-400">Personalize your Life OS.</p>
      </div>

      {/* Appearance */}
      <Section title="Appearance" icon={Sparkles}>
        <div className="mb-5">
          <div className="label mb-2">Theme</div>
          <div className="grid grid-cols-3 gap-2 max-w-xs">
            {THEMES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.mode}
                  onClick={() => setTheme(t.mode)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition
                    ${theme === t.mode ? 'border-accent-500 bg-accent-500/10 text-accent-600 dark:text-accent-300' : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  <Icon size={18} />
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="label mb-2">Accent color</div>
          <div className="flex gap-2.5">
            {ACCENTS.map((a) => (
              <button
                key={a.name}
                onClick={() => setAccent(a.name)}
                className={`size-9 rounded-full transition flex items-center justify-center
                  ${accent === a.name ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-slate-400' : ''}`}
                style={{ background: a.color }}
                title={a.name}
              >
                {accent === a.name && <Check size={15} className="text-white" />}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* AI Memory */}
      <Section title="Long-term AI Memory" icon={Brain}>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          The assistant remembers these facts about you to give better, more personal answers.
          Review, edit, or delete anything at any time.
        </p>
        <div className="space-y-2">
          <AnimatePresence>
            {memories.map((m) => (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="card p-3.5 flex items-start gap-3 group"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-accent-500 font-semibold uppercase tracking-wide">{m.key}</div>
                  <div className="text-sm mt-0.5">{m.value}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{m.category}</div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => setEditing(m)} className="btn-ghost !p-1.5 !rounded-lg"><Pencil size={13} /></button>
                  <button onClick={() => remove(m.id)} className="btn-ghost !p-1.5 !rounded-lg text-rose-500"><Trash2 size={13} /></button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {memories.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">No memories stored yet.</p>
          )}
        </div>
        <button onClick={() => setShowNew(true)} className="btn-outline mt-4">
          <Plus size={15} /> Add memory
        </button>
      </Section>

      {/* Security */}
      <Section title="Security & Privacy" icon={Shield}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-accent-500/10 text-accent-500 grid place-items-center">
                <Lock size={17} />
              </div>
              <div>
                <div className="text-sm font-medium">PIN lock</div>
                <div className="text-xs text-slate-400">App is protected with a 6-digit PIN</div>
              </div>
            </div>
            <button onClick={() => setShowPinChange(true)} className="btn-outline !py-1.5 !text-xs">
              <KeyRound size={13} /> Change PIN
            </button>
          </div>

          {biometricAvailable && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-500 grid place-items-center">
                  <Fingerprint size={17} />
                </div>
                <div>
                  <div className="text-sm font-medium">Biometric unlock</div>
                  <div className="text-xs text-slate-400">Use fingerprint or face to unlock</div>
                </div>
              </div>
              <Toggle on={biometricPreferred} onClick={() => setBiometricPreferred(!biometricPreferred)} />
            </div>
          )}

          <button onClick={lock} className="btn-outline w-full">
            <Lock size={15} /> Lock now
          </button>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" icon={Bell}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-accent-500/10 text-accent-500 grid place-items-center">
                <Bell size={17} />
              </div>
              <div>
                <div className="text-sm font-medium">Push notifications</div>
                <div className="text-xs text-slate-400">{notifications.enabled ? 'Enabled' : 'Tap to enable'}</div>
              </div>
            </div>
            <Toggle
              on={notifications.enabled}
              onClick={async () => {
                if (!notifications.enabled) {
                  const perm = await requestNotificationPermission();
                  if (perm === 'granted') {
                    setNotifications({ enabled: true });
                    toast.success('Notifications enabled');
                  } else {
                    toast.error('Permission denied');
                  }
                } else {
                  setNotifications({ enabled: false });
                }
              }}
            />
          </div>

          {notifications.enabled && (
            <div className="space-y-1 pl-1">
              <NotifToggle label="Daily brief" desc="Morning summary of your day" checked={notifications.dailyBrief} onChange={(v) => setNotifications({ dailyBrief: v })} />
              <NotifToggle label="Evening reflection" desc="Reminder to journal" checked={notifications.eveningReflection} onChange={(v) => setNotifications({ eveningReflection: v })} />
              <NotifToggle label="Daily motivation" desc="An inspiring message" checked={notifications.motivation} onChange={(v) => setNotifications({ motivation: v })} />
              <NotifToggle label="Bible verse" desc="Daily scripture" checked={notifications.bibleVerse} onChange={(v) => setNotifications({ bibleVerse: v })} />
              <NotifToggle label="Task reminders" desc="Your most important tasks" checked={notifications.taskReminders} onChange={(v) => setNotifications({ taskReminders: v })} />
            </div>
          )}

          {notifications.enabled && (
            <div className="pt-2">
              <div className="label mb-2">Test notification</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => sendDailyBrief(notifications)} className="btn-ghost !py-1.5 !text-xs">Brief</button>
                <button onClick={() => sendEveningReflection()} className="btn-ghost !py-1.5 !text-xs">Evening</button>
                <button onClick={() => sendMotivation()} className="btn-ghost !py-1.5 !text-xs">Motivation</button>
                <button onClick={() => sendBibleVerse()} className="btn-ghost !py-1.5 !text-xs">Verse</button>
                <button onClick={() => sendTaskReminder()} className="btn-ghost !py-1.5 !text-xs">Tasks</button>
                <button onClick={() => sendPrayerReminder()} className="btn-ghost !py-1.5 !text-xs">Prayer</button>
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section title="About" icon={Sparkles}>
        <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1.5">
          <p>Life OS — your private personal operating system.</p>
          <p>Journal, tasks, habits, goals, projects, notes, calendar, and an AI assistant that learns your life.</p>
          <p className="text-xs text-slate-400 pt-2">Your data is stored in your own private database. Nothing leaves your account.</p>
        </div>
      </Section>

      <MemoryModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onSave={async (key, value, category) => {
          const { error } = await createMemory({ key, value, category });
          if (error) { toast.error('Could not save'); return; }
          toast.success('Memory saved');
          loadMemories();
          setShowNew(false);
        }}
      />
      {editing && (
        <MemoryModal
          open={true}
          onClose={() => setEditing(null)}
          initial={editing}
          onSave={async (key, value, category) => {
            const { error } = await updateMemory(editing.id, { key, value, category });
            if (error) { toast.error('Could not save'); return; }
            toast.success('Memory updated');
            loadMemories();
            setEditing(null);
          }}
        />
      )}
      <PinChangeModal open={showPinChange} onClose={() => setShowPinChange(false)} />
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className="text-accent-500" />
        <h3 className="font-display font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function MemoryModal({ open, onClose, initial, onSave }: {
  open: boolean;
  onClose: () => void;
  initial?: AiMemory;
  onSave: (key: string, value: string, category: string) => Promise<void>;
}) {
  const [key, setKey] = useState(initial?.key ?? '');
  const [value, setValue] = useState(initial?.value ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'preference');
  useEffect(() => {
    if (open) {
      setKey(initial?.key ?? '');
      setValue(initial?.value ?? '');
      setCategory(initial?.category ?? 'preference');
    }
  }, [open, initial]);

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Memory' : 'Add Memory'} size="sm">
      <div className="space-y-4">
        <div>
          <div className="label mb-1.5">Key</div>
          <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. favorite_books" className="input" />
        </div>
        <div>
          <div className="label mb-1.5">Value</div>
          <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} className="input resize-y" placeholder="What should the assistant remember?" />
        </div>
        <div>
          <div className="label mb-1.5">Category</div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
            <option value="preference">Preference</option>
            <option value="goal">Goal</option>
            <option value="people">People</option>
            <option value="project">Project</option>
            <option value="milestone">Milestone</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave(key.trim(), value.trim(), category)} disabled={!key.trim() || !value.trim()}>
            {initial ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-6 w-11 rounded-full transition ${on ? 'bg-accent-500' : 'bg-slate-200 dark:bg-slate-700'}`}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm ${on ? 'left-[22px]' : 'left-0.5'}`}
      />
    </button>
  );
}

function NotifToggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-slate-400">{desc}</div>
      </div>
      <Toggle on={checked} onClick={() => onChange(!checked)} />
    </div>
  );
}

function PinChangeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const unlock = useAuth((s) => s.unlock);
  const setupPin = useAuth((s) => s.setupPin);

  useEffect(() => {
    if (open) { setOldPin(''); setNewPin(''); setConfirm(''); setError(null); }
  }, [open]);

  async function submit() {
    setError(null);
    if (!/^\d{6}$/.test(oldPin)) { setError('Enter your current 6-digit PIN'); return; }
    if (!/^\d{6}$/.test(newPin)) { setError('New PIN must be 6 digits'); return; }
    if (newPin !== confirm) { setError('New PINs do not match'); return; }
    setBusy(true);
    const ok = await unlock(oldPin);
    if (!ok) { setError('Current PIN is incorrect'); setBusy(false); return; }
    await setupPin(newPin);
    setBusy(false);
    toast.success('PIN changed successfully');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Change PIN" size="sm">
      <div className="space-y-4">
        <div>
          <div className="label mb-1.5">Current PIN</div>
          <input type="password" inputMode="numeric" maxLength={6} value={oldPin} onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))} className="input font-mono tracking-widest" placeholder="••••••" />
        </div>
        <div>
          <div className="label mb-1.5">New PIN</div>
          <input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} className="input font-mono tracking-widest" placeholder="••••••" />
        </div>
        <div>
          <div className="label mb-1.5">Confirm new PIN</div>
          <input type="password" inputMode="numeric" maxLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ''))} className="input font-mono tracking-widest" placeholder="••••••" />
        </div>
        {error && <p className="text-sm text-rose-500">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={busy}>Change PIN</button>
        </div>
      </div>
    </Modal>
  );
}
