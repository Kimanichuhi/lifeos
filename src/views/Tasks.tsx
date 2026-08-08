import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, Trash2, Flag, Calendar, Inbox, Circle, Clock, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createTask, deleteTask, updateTask } from '@/lib/api';
import { useTasks } from '@/lib/hooks';
import { useToast } from '@/lib/toast';
import { Modal } from '@/components/Modal';
import type { Task, TaskPriority, TaskStatus } from '@/lib/types';

const STATUSES: { key: TaskStatus; label: string; icon: LucideIcon }[] = [
  { key: 'todo', label: 'To Do', icon: Circle },
  { key: 'in_progress', label: 'In Progress', icon: Clock },
  { key: 'waiting', label: 'Waiting', icon: Inbox },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
];

const PRIORITIES: { key: TaskPriority; label: string; color: string }[] = [
  { key: 'urgent', label: 'Urgent', color: 'text-rose-500 bg-rose-500/10' },
  { key: 'high', label: 'High', color: 'text-amber-500 bg-amber-500/10' },
  { key: 'medium', label: 'Medium', color: 'text-blue-500 bg-blue-500/10' },
  { key: 'low', label: 'Low', color: 'text-slate-400 bg-slate-500/10' },
];

export function Tasks() {
  const { data: tasks, loading } = useTasks();
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [showNew, setShowNew] = useState(false);
  const toast = useToast();

  const filtered = useMemo(() => {
    if (!tasks) return [];
    const list = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);
    return list.sort((a, b) => {
      const order: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
    });
  }, [tasks, filter]);

  async function toggle(t: Task) {
    const next = t.status === 'completed' ? 'todo' : 'completed';
    const patch: Partial<Task> = { status: next };
    if (next === 'completed') patch.completed_at = new Date().toISOString();
    else patch.completed_at = null;
    await updateTask(t.id, patch);
    toast.success(next === 'completed' ? 'Task completed' : 'Reopened');
  }

  async function remove(id: string) {
    await deleteTask(id);
    toast.success('Task deleted');
  }

  async function cycleStatus(t: Task) {
    const order: TaskStatus[] = ['todo', 'in_progress', 'waiting', 'completed'];
    const next = order[(order.indexOf(t.status) + 1) % order.length];
    await updateTask(t.id, { status: next });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="view-title">Tasks</h2>
          <p className="text-sm text-slate-400">{tasks?.length ?? 0} total · {tasks?.filter((t) => t.status === 'completed').length ?? 0} done</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus size={16} /> New task
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={tasks?.length ?? 0} />
        {STATUSES.map((s) => {
          const Icon = s.icon;
          const count = tasks?.filter((t) => t.status === s.key).length ?? 0;
          return (
            <FilterChip
              key={s.key}
              active={filter === s.key}
              onClick={() => setFilter(s.key)}
              label={s.label}
              count={count}
              icon={<Icon size={13} />}
            />
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading && [...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl shimmer-bg animate-shimmer" />)}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <CheckCircle2 size={40} className="text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">No tasks here. Time for a break — or add one.</p>
          </div>
        )}
        <AnimatePresence>
          {filtered.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="card p-3.5 flex items-center gap-3 group hover:shadow-glow transition"
            >
              <button
                onClick={() => toggle(t)}
                className={`size-6 rounded-full border-2 grid place-items-center shrink-0 transition
                  ${t.status === 'completed' ? 'bg-accent-500 border-accent-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-accent-500'}`}
              >
                {t.status === 'completed' && <Check size={14} />}
              </button>
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-medium truncate ${t.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                  {t.title}
                </div>
                {t.due_date && (
                  <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Calendar size={11} />
                    {new Date(t.due_date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </div>
                )}
              </div>
              <span className={`chip ${PRIORITIES.find((p) => p.key === t.priority)?.color ?? ''} hidden sm:inline-flex`}>
                <Flag size={10} /> {t.priority}
              </span>
              <button
                onClick={() => cycleStatus(t)}
                className="text-xs text-slate-400 hover:text-accent-500 capitalize hidden md:block"
                title="Cycle status"
              >
                {t.status.replace('_', ' ')}
              </button>
              <button onClick={() => remove(t.id)} className="text-slate-300 hover:text-rose-500 transition opacity-0 group-hover:opacity-100">
                <Trash2 size={15} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <NewTaskModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}

function FilterChip({ active, onClick, label, count, icon }: { active: boolean; onClick: () => void; label: string; count: number; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`chip transition ${active ? 'bg-accent-500 text-white' : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
    >
      {icon}
      {label}
      <span className={`text-[10px] ${active ? 'text-white/70' : 'text-slate-400'}`}>{count}</span>
    </button>
  );
}

function NewTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [due, setDue] = useState('');
  const [notes, setNotes] = useState('');
  const toast = useToast();

  async function submit() {
    if (!title.trim()) return;
    const { error } = await createTask({
      title: title.trim(),
      priority,
      due_date: due || null,
      notes: notes.trim() || null,
      status: 'todo',
    });
    if (error) { toast.error('Could not create task'); return; }
    toast.success('Task created');
    setTitle(''); setPriority('medium'); setDue(''); setNotes('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Task">
      <div className="space-y-4">
        <div>
          <div className="label mb-1.5">Title</div>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="What needs to be done?" className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label mb-1.5">Priority</div>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="input">
              {PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <div className="label mb-1.5">Due date</div>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="input" />
          </div>
        </div>
        <div>
          <div className="label mb-1.5">Notes</div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input resize-y" placeholder="Optional details…" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={!title.trim()}>Create task</button>
        </div>
      </div>
    </Modal>
  );
}
