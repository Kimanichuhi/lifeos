import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, Home, Bot, BookOpen, Calendar, CheckSquare, Target, Flame, Dumbbell,
  FolderKanban, StickyNote, FileText, Wallet, BarChart3, Settings, Code2,
  CornerDownLeft, ArrowUp, ArrowDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ViewKey } from './Sidebar';

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  action: () => void;
  group: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (v: ViewKey) => void;
  onNewTask?: () => void;
  onNewNote?: () => void;
  onNewJournal?: () => void;
  onNewEvent?: () => void;
  onAskAi?: (q: string) => void;
}

export function CommandPalette({
  open, onClose, onNavigate, onNewTask, onNewNote, onNewJournal, onNewEvent, onAskAi,
}: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!open) { setQuery(''); setActive(0); }
  }, [open]);

  const items = useMemo<CommandItem[]>(() => {
    const nav: { key: ViewKey; label: string; icon: CommandItem['icon'] }[] = [
      { key: 'home', label: 'Home', icon: Home },
      { key: 'assistant', label: 'AI Assistant', icon: Bot },
      { key: 'journal', label: 'Journal', icon: BookOpen },
      { key: 'calendar', label: 'Calendar', icon: Calendar },
      { key: 'tasks', label: 'Tasks', icon: CheckSquare },
      { key: 'goals', label: 'Goals', icon: Target },
      { key: 'habits', label: 'Habits', icon: Flame },
      { key: 'workout', label: 'Workout', icon: Dumbbell },
      { key: 'projects', label: 'Projects', icon: FolderKanban },
      { key: 'notes', label: 'Notes', icon: StickyNote },
      { key: 'documents', label: 'Documents', icon: FileText },
      { key: 'finance', label: 'Finance', icon: Wallet },
      { key: 'analytics', label: 'Analytics', icon: BarChart3 },
      { key: 'dev', label: 'Dev', icon: Code2 },
      { key: 'settings', label: 'Settings', icon: Settings },
    ];
    const list: CommandItem[] = [
      ...nav.map((n) => ({
        id: `nav-${n.key}`, label: `Go to ${n.label}`, icon: n.icon,
        action: () => onNavigate(n.key), group: 'Navigate',
      })),
      { id: 'new-task', label: 'New Task', icon: CheckSquare, action: () => onNewTask?.(), group: 'Create', hint: 'T' },
      { id: 'new-note', label: 'New Note', icon: StickyNote, action: () => onNewNote?.(), group: 'Create', hint: 'N' },
      { id: 'new-journal', label: "Today's Journal", icon: BookOpen, action: () => onNewJournal?.(), group: 'Create', hint: 'J' },
      { id: 'new-event', label: 'New Event', icon: Calendar, action: () => onNewEvent?.(), group: 'Create', hint: 'E' },
      { id: 'ask-plan', label: 'Ask AI: Plan my day', icon: Bot, action: () => onAskAi?.('What should I work on today?'), group: 'Ask AI' },
      { id: 'ask-week', label: 'Ask AI: What did I accomplish this week?', icon: Bot, action: () => onAskAi?.('What did I accomplish this week?'), group: 'Ask AI' },
      { id: 'ask-forget', label: 'Ask AI: What am I forgetting?', icon: Bot, action: () => onAskAi?.('What am I forgetting?'), group: 'Ask AI' },
    ];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((i) => i.label.toLowerCase().includes(q));
  }, [query, onNavigate, onNewTask, onNewNote, onNewJournal, onNewEvent, onAskAi]);

  useEffect(() => {
    if (active >= items.length) setActive(0);
  }, [items, active]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const item = items[active];
        if (item) { item.action(); onClose(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items, active, onClose]);

  let lastGroup = '';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-xl card overflow-hidden shadow-2xl"
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
                placeholder="Type a command or search…"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400"
              />
              <kbd className="text-[10px] text-slate-400 font-mono">esc</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {items.length === 0 && (
                <div className="text-center text-sm text-slate-400 py-8">No results</div>
              )}
              {items.map((item, i) => {
                const Icon = item.icon;
                const showGroup = item.group !== lastGroup;
                lastGroup = item.group;
                return (
                  <div key={item.id}>
                    {showGroup && (
                      <div className="label px-3 pt-3 pb-1">{item.group}</div>
                    )}
                    <button
                      onMouseEnter={() => setActive(i)}
                      onClick={() => { item.action(); onClose(); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition
                        ${i === active ? 'bg-accent-500/10 text-accent-600 dark:text-accent-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
                    >
                      <Icon size={16} className="shrink-0 opacity-70" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {i === active && <CornerDownLeft size={14} className="opacity-50" />}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-200/70 dark:border-slate-800/70 text-[11px] text-slate-400">
              <span className="flex items-center gap-1"><ArrowUp size={11} /><ArrowDown size={11} /> navigate</span>
              <span className="flex items-center gap-1"><CornerDownLeft size={11} /> select</span>
              <span className="flex items-center gap-1">esc close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
