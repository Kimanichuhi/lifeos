import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, FileText, CheckSquare, BookOpen, StickyNote, Calendar, Target, FolderKanban } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Result {
  id: string;
  title: string;
  snippet: string;
  kind: string;
  icon: LucideIcon;
}

const KIND_ICON: Record<string, Result['icon']> = {
  task: CheckSquare,
  note: StickyNote,
  journal: BookOpen,
  event: Calendar,
  goal: Target,
  project: FolderKanban,
  document: FileText,
};

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate?: (kind: string) => void;
}

export function GlobalSearch({ open, onClose, onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) { setQuery(''); setResults([]); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    let cancelled = false;
    if (!query.trim() || query.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    (async () => {
      const q = query.toLowerCase();
      const [tasks, notes, journals, events, goals, projects] = await Promise.all([
        supabase.from('tasks').select('*').ilike('title', `%${query}%`),
        supabase.from('notes').select('*').or(`title.ilike.%${query}%,content.ilike.%${query}%`),
        supabase.from('journal_entries').select('*').or(`gratitude.ilike.%${query}%,wins.ilike.%${query}%,challenges.ilike.%${query}%,lessons.ilike.%${query}%`),
        supabase.from('events').select('*').ilike('title', `%${query}%`),
        supabase.from('goals').select('*').or(`title.ilike.%${query}%,description.ilike.%${query}%`),
        supabase.from('projects').select('*').or(`name.ilike.%${query}%,description.ilike.%${query}%`),
      ]);
      if (cancelled) return;
      const all: Result[] = [
        ...(tasks.data ?? []).map((t) => ({ id: t.id, title: t.title, snippet: t.notes ?? 'Task', kind: 'task', icon: KIND_ICON.task })),
        ...(notes.data ?? []).map((n) => ({ id: n.id, title: n.title, snippet: (n.content ?? '').slice(0, 80), kind: 'note', icon: KIND_ICON.note })),
        ...(journals.data ?? []).map((j) => ({ id: j.id, title: `Journal — ${j.entry_date}`, snippet: [j.gratitude, j.wins, j.lessons].filter(Boolean).join(' · ').slice(0, 100), kind: 'journal', icon: KIND_ICON.journal })),
        ...(events.data ?? []).map((e) => ({ id: e.id, title: e.title, snippet: `${e.start_time.slice(0, 10)} — ${e.location ?? ''}`, kind: 'event', icon: KIND_ICON.event })),
        ...(goals.data ?? []).map((g) => ({ id: g.id, title: g.title, snippet: g.description ?? `${g.category} · ${g.progress}%`, kind: 'goal', icon: KIND_ICON.goal })),
        ...(projects.data ?? []).map((p) => ({ id: p.id, title: p.name, snippet: p.description ?? `${p.status} · ${p.progress}%`, kind: 'project', icon: KIND_ICON.project })),
      ];
      setResults(all);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Result[]>();
    results.forEach((r) => {
      if (!map.has(r.kind)) map.set(r.kind, []);
      map.get(r.kind)!.push(r);
    });
    return map;
  }, [results]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center pt-[10vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-2xl card overflow-hidden shadow-2xl"
            initial={{ scale: 0.97, y: -10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, y: -10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/70 dark:border-slate-800/70">
              <Search size={18} className="text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your journal, tasks, notes, events, goals…"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400"
              />
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {loading && <div className="text-center text-sm text-slate-400 py-6">Searching…</div>}
              {!loading && query.trim().length >= 2 && results.length === 0 && (
                <div className="text-center text-sm text-slate-400 py-8">No matches for "{query}"</div>
              )}
              {!loading && query.trim().length < 2 && (
                <div className="text-center text-sm text-slate-400 py-8">Start typing to search across your entire Life OS.</div>
              )}
              {[...grouped.entries()].map(([kind, items]) => (
                <div key={kind}>
                  <div className="label px-3 pt-3 pb-1 capitalize">{kind}s</div>
                  {items.map((r) => {
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.id}
                        onClick={() => { onNavigate?.(r.kind); onClose(); }}
                        className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-slate-100 dark:hover:bg-slate-800/50 transition text-left"
                      >
                        <Icon size={16} className="shrink-0 mt-0.5 opacity-60" />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{r.title}</div>
                          <div className="text-xs text-slate-400 truncate">{r.snippet}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
