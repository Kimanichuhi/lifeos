import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FolderKanban, Trash2, CheckCircle2, Clock, Pause, Link2, Calendar } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createProject, deleteProject, updateProject } from '@/lib/api';
import { useProjects, useTasks } from '@/lib/hooks';
import { useToast } from '@/lib/toast';
import { Modal } from '@/components/Modal';
import type { Project, ProjectStatus } from '@/lib/types';

const COLORS = ['blue', 'emerald', 'amber', 'violet', 'cyan', 'rose'];

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function linkLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const STATUS_META: Record<ProjectStatus, { label: string; icon: LucideIcon; color: string }> = {
  active: { label: 'Active', icon: Clock, color: 'text-emerald-500 bg-emerald-500/10' },
  on_hold: { label: 'On hold', icon: Pause, color: 'text-amber-500 bg-amber-500/10' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-blue-500 bg-blue-500/10' },
  archived: { label: 'Archived', icon: CheckCircle2, color: 'text-slate-400 bg-slate-500/10' },
};

export function Projects() {
  const { data: projects, loading } = useProjects();
  const { data: tasks } = useTasks();
  const [showNew, setShowNew] = useState(false);
  const toast = useToast();

  const taskCounts = useMemo(() => {
    const m = new Map<string, { total: number; done: number }>();
    (tasks ?? []).forEach((t) => {
      if (!t.project_id) return;
      const cur = m.get(t.project_id) ?? { total: 0, done: 0 };
      cur.total++;
      if (t.status === 'completed') cur.done++;
      m.set(t.project_id, cur);
    });
    return m;
  }, [tasks]);

  async function setProgress(p: Project, progress: number) {
    const status: ProjectStatus = progress >= 100 ? 'completed' : p.status === 'completed' ? 'active' : p.status;
    await updateProject(p.id, { progress, status });
  }

  async function cycleStatus(p: Project) {
    const order: ProjectStatus[] = ['active', 'on_hold', 'completed', 'archived'];
    const next = order[(order.indexOf(p.status) + 1) % order.length];
    await updateProject(p.id, { status: next });
  }

  async function remove(id: string) {
    await deleteProject(id);
    toast.success('Project deleted');
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="view-title">Projects</h2>
          <p className="text-sm text-slate-400">Each project is a hub for tasks, notes, and progress.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus size={16} /> New project
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loading && [...Array(3)].map((_, i) => <div key={i} className="h-44 rounded-2xl shimmer-bg animate-shimmer" />)}
        <AnimatePresence>
          {(projects ?? []).map((p) => {
            const meta = STATUS_META[p.status];
            const StatusIcon = meta.icon;
            const counts = taskCounts.get(p.id);
            const daysLeft = p.due_date ? Math.ceil((new Date(p.due_date + 'T00:00:00').getTime() - Date.now()) / 86400000) : null;
            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="card p-5 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`size-9 rounded-xl grid place-items-center bg-${p.color}-500/10 text-${p.color}-500`}>
                      <FolderKanban size={17} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-bold truncate">{p.name}</h3>
                      {p.description && <p className="text-xs text-slate-400 line-clamp-2">{p.description}</p>}
                    </div>
                  </div>
                  <button onClick={() => remove(p.id)} className="text-slate-300 hover:text-rose-500 transition opacity-0 group-hover:opacity-100">
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  <button onClick={() => cycleStatus(p)} className={`chip ${meta.color} capitalize`}>
                    <StatusIcon size={11} /> {meta.label}
                  </button>
                  {counts && (
                    <span className="chip bg-slate-100 dark:bg-slate-800/60 text-slate-500">
                      {counts.done}/{counts.total} tasks
                    </span>
                  )}
                  {p.due_date && (
                    <span className={`chip bg-slate-100 dark:bg-slate-800/60 ${daysLeft !== null && daysLeft <= 3 && p.status !== 'completed' ? 'text-amber-500' : 'text-slate-500'}`}>
                      <Calendar size={11} /> {new Date(p.due_date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {p.link && (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="chip bg-slate-100 dark:bg-slate-800/60 text-slate-500 hover:text-accent-500 transition"
                    >
                      <Link2 size={11} /> {linkLabel(p.link)}
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">Progress</span>
                      <span className="font-semibold">{p.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className={`h-full rounded-full bg-${p.color}-500 transition-all`} style={{ width: `${p.progress}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setProgress(p, Math.max(0, p.progress - 10))} className="btn-ghost !p-1.5 !rounded-lg text-xs">−10</button>
                    <button onClick={() => setProgress(p, Math.min(100, p.progress + 10))} className="btn-ghost !p-1.5 !rounded-lg text-xs">+10</button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {!loading && (projects ?? []).length === 0 && (
        <div className="text-center py-16">
          <FolderKanban size={40} className="text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">No projects yet. Create one to organize your work.</p>
        </div>
      )}

      <NewProjectModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}

function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('blue');
  const [link, setLink] = useState('');
  const [dueDate, setDueDate] = useState('');
  const toast = useToast();

  async function submit() {
    if (!name.trim()) return;
    const { error } = await createProject({
      name: name.trim(),
      description: description.trim() || null,
      color,
      status: 'active',
      progress: 0,
      link: link.trim() ? normalizeUrl(link) : null,
      due_date: dueDate || null,
    });
    if (error) { toast.error('Could not create project'); return; }
    toast.success('Project created');
    setName(''); setDescription(''); setLink(''); setDueDate('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Project">
      <div className="space-y-4">
        <div>
          <div className="label mb-1.5">Name</div>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" className="input" />
        </div>
        <div>
          <div className="label mb-1.5">Description</div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What is this project about?" className="input resize-y" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label mb-1.5">Link</div>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Repo, site, or doc URL" className="input" />
          </div>
          <div>
            <div className="label mb-1.5">Due date</div>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" />
          </div>
        </div>
        <div>
          <div className="label mb-1.5">Color</div>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`size-8 rounded-full bg-${c}-500 transition ${color === c ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-slate-400' : ''}`}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={!name.trim()}>Create project</button>
        </div>
      </div>
    </Modal>
  );
}
