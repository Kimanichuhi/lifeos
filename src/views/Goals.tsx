import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, Trash2, Calendar, TrendingUp } from 'lucide-react';
import { createGoal, deleteGoal, updateGoal } from '@/lib/api';
import { useGoals } from '@/lib/hooks';
import { useToast } from '@/lib/toast';
import { Modal } from '@/components/Modal';
import type { Goal, GoalCategory, GoalStatus } from '@/lib/types';

const CATEGORIES: { key: GoalCategory; label: string; color: string }[] = [
  { key: 'life', label: 'Life', color: 'bg-slate-500' },
  { key: 'career', label: 'Career', color: 'bg-blue-500' },
  { key: 'business', label: 'Business', color: 'bg-amber-500' },
  { key: 'financial', label: 'Financial', color: 'bg-emerald-500' },
  { key: 'health', label: 'Health', color: 'bg-cyan-500' },
  { key: 'learning', label: 'Learning', color: 'bg-violet-500' },
  { key: 'spiritual', label: 'Spiritual', color: 'bg-rose-500' },
];

function catMeta(c: string) {
  return CATEGORIES.find((x) => x.key === c) ?? CATEGORIES[0];
}

export function Goals() {
  const { data: goals, loading } = useGoals();
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<GoalCategory | 'all'>('all');
  const toast = useToast();

  const filtered = useMemo(() => {
    if (!goals) return [];
    const list = filter === 'all' ? goals : goals.filter((g) => g.category === filter);
    return list.sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed'));
  }, [goals, filter]);

  async function setProgress(g: Goal, progress: number) {
    const status: GoalStatus = progress >= 100 ? 'completed' : g.status === 'completed' ? 'active' : g.status;
    await updateGoal(g.id, { progress, status });
  }

  async function remove(id: string) {
    await deleteGoal(id);
    toast.success('Goal deleted');
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="view-title">Goals</h2>
          <p className="text-sm text-slate-400">Where you're headed. Track every milestone.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus size={16} /> New goal
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        <button
          onClick={() => setFilter('all')}
          className={`chip transition ${filter === 'all' ? 'bg-accent-500 text-white' : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500'}`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`chip transition ${filter === c.key ? 'bg-accent-500 text-white' : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500'}`}
          >
            <span className={`size-2 rounded-full ${c.color}`} /> {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loading && [...Array(4)].map((_, i) => <div key={i} className="h-40 rounded-2xl shimmer-bg animate-shimmer" />)}
        <AnimatePresence>
          {filtered.map((g) => {
            const meta = catMeta(g.category);
            const daysLeft = g.target_date ? Math.ceil((new Date(g.target_date).getTime() - Date.now()) / 86400000) : null;
            return (
              <motion.div
                key={g.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className={`card p-5 group ${g.status === 'completed' ? 'opacity-70' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`size-9 rounded-xl grid place-items-center ${meta.color}/10 text-${meta.color.replace('bg-', '')}`}>
                      <Target size={17} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-semibold truncate">{g.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="capitalize">{g.category}</span>
                        {g.target_date && (
                          <span className="flex items-center gap-1">
                            · <Calendar size={11} /> {new Date(g.target_date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                        {daysLeft !== null && daysLeft >= 0 && daysLeft <= 14 && g.status !== 'completed' && (
                          <span className="text-amber-500 font-medium">· {daysLeft}d left</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => remove(g.id)} className="text-slate-300 hover:text-rose-500 transition opacity-0 group-hover:opacity-100">
                    <Trash2 size={15} />
                  </button>
                </div>
                {g.description && <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{g.description}</p>}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">Progress</span>
                      <span className="font-semibold">{g.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className={`h-full rounded-full ${meta.color} transition-all`} style={{ width: `${g.progress}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setProgress(g, Math.max(0, g.progress - 10))} className="btn-ghost !p-1.5 !rounded-lg text-xs">−10</button>
                    <button onClick={() => setProgress(g, Math.min(100, g.progress + 10))} className="btn-ghost !p-1.5 !rounded-lg text-xs">+10</button>
                  </div>
                </div>
                {g.status === 'completed' && (
                  <div className="mt-3 chip bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                    <TrendingUp size={12} /> Completed
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Target size={40} className="text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">No goals yet. Define what you're working toward.</p>
        </div>
      )}

      <NewGoalModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}

function NewGoalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>('life');
  const [targetDate, setTargetDate] = useState('');
  const toast = useToast();

  async function submit() {
    if (!title.trim()) return;
    const { error } = await createGoal({
      title: title.trim(),
      description: description.trim() || null,
      category,
      target_date: targetDate || null,
      progress: 0,
      status: 'active',
    });
    if (error) { toast.error('Could not create goal'); return; }
    toast.success('Goal created');
    setTitle(''); setDescription(''); setTargetDate('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Goal">
      <div className="space-y-4">
        <div>
          <div className="label mb-1.5">Title</div>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you want to achieve?" className="input" />
        </div>
        <div>
          <div className="label mb-1.5">Description</div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Why does this matter?" className="input resize-y" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label mb-1.5">Category</div>
            <select value={category} onChange={(e) => setCategory(e.target.value as GoalCategory)} className="input">
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <div className="label mb-1.5">Target date</div>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="input" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={!title.trim()}>Create goal</button>
        </div>
      </div>
    </Modal>
  );
}
