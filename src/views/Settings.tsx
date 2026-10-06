import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Plus, Trash2, Pencil, Sparkles, Sun, Moon, Monitor, Check, Shield, Bell, KeyRound, Mail, LogOut, Code2, Save } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createMemory, deleteMemory, getMemories, updateMemory } from '@/lib/api';
import { useSettings, type AccentName, type ThemeMode } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { requestNotificationPermission, sendDailyBrief, sendEveningReflection, sendMotivation, sendBibleVerse, sendTaskReminder, sendPrayerReminder } from '@/lib/notifications';
import { getGitHubUsername, setGitHubUsername } from '@/lib/github';
import { getUptimeTargets, setUptimeTargets, type UptimeTarget } from '@/lib/uptime';
import { Modal } from '@/components/Modal';
import type { AiMemory } from '@/lib/types';

const ACCENTS: { name: AccentName; color: string }[] = [
  { name: 'orange', color: 'rgb(232 80 31)' },
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

  const email = useAuth((s) => s.email);
  const signOut = useAuth((s) => s.signOut);
  const notifications = useAuth((s) => s.notifications);
  const setNotifications = useAuth((s) => s.setNotifications);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

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
        <h2 className="view-title">Settings</h2>
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
      <Section title="Account & Security" icon={Shield}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-accent-500/10 text-accent-500 grid place-items-center">
                <Mail size={17} />
              </div>
              <div>
                <div className="text-sm font-medium">Signed in as</div>
                <div className="text-xs text-slate-400">{email}</div>
              </div>
            </div>
            <button onClick={() => setShowPasswordChange(true)} className="btn-outline !py-1.5 !text-xs">
              <KeyRound size={13} /> Change password
            </button>
          </div>

          <button onClick={signOut} className="btn-outline w-full">
            <LogOut size={15} /> Sign out
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

      <DeveloperSection />

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
      <PasswordChangeModal open={showPasswordChange} onClose={() => setShowPasswordChange(false)} />
    </div>
  );
}

function DeveloperSection() {
  const [username, setUsername] = useState(getGitHubUsername());
  const [targets, setTargets] = useState<UptimeTarget[]>(getUptimeTargets());
  const toast = useToast();

  function saveUsername() {
    setGitHubUsername(username);
    toast.success('GitHub username saved');
  }

  function updateTarget(i: number, patch: Partial<UptimeTarget>) {
    setTargets((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }

  function addTarget() {
    setTargets((prev) => [...prev, { name: '', url: '' }]);
  }

  function removeTarget(i: number) {
    setTargets((prev) => prev.filter((_, idx) => idx !== i));
  }

  function saveTargets() {
    const cleaned = targets.filter((t) => t.name.trim() && t.url.trim());
    setUptimeTargets(cleaned);
    setTargets(cleaned);
    toast.success('Reachability targets saved');
  }

  return (
    <Section title="Developer" icon={Code2}>
      <div className="space-y-5">
        <div>
          <div className="label mb-1.5">GitHub username</div>
          <p className="text-xs text-slate-400 mb-2">Powers the activity feed on the Dev view. Public data only, no token needed.</p>
          <div className="flex gap-2">
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. octocat" className="input" />
            <button onClick={saveUsername} className="btn-outline shrink-0"><Save size={14} /> Save</button>
          </div>
        </div>

        <div>
          <div className="label mb-1.5">Reachability targets</div>
          <p className="text-xs text-slate-400 mb-2">URLs pinged from the Dev view to show basic up/down + latency.</p>
          <div className="space-y-2">
            {targets.map((t, i) => (
              <div key={i} className="flex gap-2">
                <input value={t.name} onChange={(e) => updateTarget(i, { name: e.target.value })} placeholder="Name" className="input w-32" />
                <input value={t.url} onChange={(e) => updateTarget(i, { url: e.target.value })} placeholder="https://…" className="input flex-1" />
                <button onClick={() => removeTarget(i)} className="btn-ghost !p-2.5 !rounded-lg text-rose-500 shrink-0"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={addTarget} className="btn-ghost !py-1.5 !text-xs"><Plus size={13} /> Add target</button>
            <button onClick={saveTargets} className="btn-outline !py-1.5 !text-xs"><Save size={13} /> Save targets</button>
          </div>
        </div>
      </div>
    </Section>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className="text-accent-500" />
        <h3 className="font-display font-bold">{title}</h3>
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

function PasswordChangeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const changePassword = useAuth((s) => s.changePassword);

  useEffect(() => {
    if (open) { setCurrentPassword(''); setNewPassword(''); setConfirm(''); setError(null); }
  }, [open]);

  async function submit() {
    setError(null);
    if (!currentPassword) { setError('Enter your current password'); return; }
    if (newPassword.length < 6) { setError('New password must be at least 6 characters'); return; }
    if (newPassword !== confirm) { setError('New passwords do not match'); return; }
    setBusy(true);
    const result = await changePassword(currentPassword, newPassword);
    setBusy(false);
    if (!result) { setError('Current password is incorrect'); return; }
    if (result.failed.length > 0) {
      toast.error(`Password changed, but ${result.failed.length} of ${result.total} vault item(s) could not be re-encrypted. They may be unreadable now.`);
    } else if (result.total > 0) {
      toast.success(`Password changed. ${result.total} vault item(s) re-encrypted.`);
    } else {
      toast.success('Password changed successfully');
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Change password" size="sm">
      <div className="space-y-4">
        <div>
          <div className="label mb-1.5">Current password</div>
          <input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input" placeholder="••••••••" />
        </div>
        <div>
          <div className="label mb-1.5">New password</div>
          <input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" placeholder="••••••••" />
        </div>
        <div>
          <div className="label mb-1.5">Confirm new password</div>
          <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input" placeholder="••••••••" />
        </div>
        {error && <p className="text-sm text-rose-500">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={busy}>Change password</button>
        </div>
      </div>
    </Modal>
  );
}
