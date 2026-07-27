import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Flame, Check, TrendingUp } from 'lucide-react';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createHabit, deleteHabit, toggleHabitLog, updateHabit } from '@/lib/api';
import { useHabits, useHabitLogs } from '@/lib/hooks';
import { useToast } from '@/lib/toast';
import { Modal } from '@/components/Modal';
import type { Habit, HabitLog } from '@/lib/types';

const HABIT_COLORS = ['emerald', 'blue', 'amber', 'violet', 'cyan', 'rose', 'sky', 'orange'];
const HABIT_ICONS = ['Check', 'Dumbbell', 'BookOpen', 'Code2', 'Sparkles', 'Brain', 'Droplets', 'Heart', 'Coffee', 'Sun', 'Moon', 'Music'];

function todayStr() { return new Date().toISOString().slice(0, 10); }

function lastNDays(n: number) {
  const days: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const cur = new Date(d);
    cur.setDate(d.getDate() - i);
    days.push(cur.toISOString().slice(0, 10));
  }
  return days;
}

export function Habits() {
  const { data: habits, loading } = useHabits();
  const { data: logs } = useHabitLogs();
  const [showNew, setShowNew] = useState(false);
  const toast = useToast();

  const logMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    (logs ?? []).forEach((l) => {
      if (!l.completed) return;
      if (!m.has(l.habit_id)) m.set(l.habit_id, new Set());
      m.get(l.habit_id)!.add(l.log_date);
    });
    return m;
  }, [logs]);

  const days = useMemo(() => lastNDays(35), []);

  function streak(habitId: string) {
    const set = logMap.get(habitId);
    if (!set) return 0;
    let s = 0;
    const d = new Date();
    if (!set.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
    while (set.has(d.toISOString().slice(0, 10))) { s++; d.setDate(d.getDate() - 1); }
    return s;
  }

  function weekCount(habitId: string, target: number) {
    const set = logMap.get(habitId);
    if (!set) return 0;
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    let c = 0;
    days.slice(-7).forEach((d) => { if (set.has(d)) c++; });
    return Math.min(c, target);
  }

  async function toggle(habitId: string, date: string, completed: boolean) {
    await toggleHabitLog(habitId, date, !completed);
  }

  async function remove(id: string) {
    await deleteHabit(id);
    toast.success('Habit deleted');
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-2xl">Habits</h2>
          <p className="text-sm text-slate-400">Build streaks. Small steps, every day.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus size={16} /> New habit
        </button>
      </div>

      <div className="space-y-4">
        {loading && [...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-2xl shimmer-bg animate-shimmer" />)}
        {!loading && (habits ?? []).length === 0 && (
          <div className="text-center py-16">
            <Flame size={40} className="text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">No habits yet. Add one to start tracking.</p>
          </div>
        )}
        {(habits ?? []).map((h) => {
          const set = logMap.get(h.id) ?? new Set<string>();
          const s = streak(h.id);
          const wc = weekCount(h.id, h.target_per_week);
          const Icon = (Icons as unknown as Record<string, LucideIcon>)[h.icon] ?? Icons.Check;
          return (
            <motion.div
              key={h.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-5 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`size-10 rounded-xl grid place-items-center bg-${h.color}-500/10 text-${h.color}-500`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="font-display font-semibold">{h.name}</div>
                    {h.description && <div className="text-xs text-slate-400">{h.description}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-500 font-semibold">
                      <Flame size={14} /> {s}
                    </div>
                    <div className="text-[10px] text-slate-400">day streak</div>
                  </div>
                  <button onClick={() => remove(h.id)} className="text-slate-300 hover:text-rose-500 transition opacity-0 group-hover:opacity-100">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Heatmap */}
              <div className="flex gap-1 flex-wrap mb-3">
                {days.map((d) => {
                  const done = set.has(d);
                  const isToday = d === todayStr();
                  return (
                    <button
                      key={d}
                      onClick={() => toggle(h.id, d, done)}
                      title={`${d}${done ? ' — done' : ''}`}
                      className={`size-6 rounded-md transition relative
                        ${done ? `bg-${h.color}-500` : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'}
                        ${isToday ? 'ring-2 ring-accent-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900' : ''}`}
                    />
                  );
                })}
              </div>

              {/* Weekly progress */}
              <div className="flex items-center gap-2">
                <TrendingUp size={13} className="text-slate-400" />
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full bg-${h.color}-500 transition-all`} style={{ width: `${(wc / h.target_per_week) * 100}%` }} />
                </div>
                <span className="text-xs text-slate-400">{wc}/{h.target_per_week} this week</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <NewHabitModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}

function NewHabitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Check');
  const [color, setColor] = useState('emerald');
  const [target, setTarget] = useState(7);
  const toast = useToast();

  async function submit() {
    if (!name.trim()) return;
    const { error } = await createHabit({
      name: name.trim(),
      description: description.trim() || null,
      icon, color, target_per_week: target,
    });
    if (error) { toast.error('Could not create habit'); return; }
    toast.success('Habit created');
    setName(''); setDescription(''); setIcon('Check'); setColor('emerald'); setTarget(7);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Habit">
      <div className="space-y-4">
        <div>
          <div className="label mb-1.5">Name</div>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Morning run" className="input" />
        </div>
        <div>
          <div className="label mb-1.5">Description</div>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" className="input" />
        </div>
        <div>
          <div className="label mb-1.5">Icon</div>
          <div className="grid grid-cols-6 gap-1.5">
            {HABIT_ICONS.map((ic) => {
              const Icon = (Icons as unknown as Record<string, LucideIcon>)[ic] ?? Icons.Check;
              return (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`size-10 rounded-lg grid place-items-center transition
                    ${icon === ic ? 'bg-accent-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200'}`}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="label mb-1.5">Color</div>
          <div className="flex gap-1.5 flex-wrap">
            {HABIT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`size-8 rounded-full bg-${c}-500 transition ${color === c ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-slate-400' : ''}`}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="label mb-1.5">Target per week</div>
          <input type="number" min={1} max={7} value={target} onChange={(e) => setTarget(Number(e.target.value))} className="input" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={!name.trim()}>Create habit</button>
        </div>
      </div>
    </Modal>
  );
}
