import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar, type ViewKey } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { CommandPalette } from '@/components/CommandPalette';
import { GlobalSearch } from '@/components/GlobalSearch';
import { Toaster } from '@/components/Toaster';
import { AuthScreen } from '@/components/AuthScreen';
import { InstallBanner } from '@/components/InstallBanner';
import { PermissionsPrompt } from '@/components/PermissionsPrompt';
import { useToastStore } from '@/lib/toast';
import { useThemeInit } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { runScheduledNotifications } from '@/lib/notifications';
import { Dashboard } from '@/views/Dashboard';
import { Assistant } from '@/views/Assistant';
import { Journal } from '@/views/Journal';
import { Tasks } from '@/views/Tasks';
import { Habits } from '@/views/Habits';
import { Notes } from '@/views/Notes';
import { Calendar } from '@/views/Calendar';
import { Goals } from '@/views/Goals';
import { Projects } from '@/views/Projects';
import { Analytics } from '@/views/Analytics';
import { Finance } from '@/views/Finance';
import { Documents } from '@/views/Documents';
import { Dev } from '@/views/Dev';
import { Vault } from '@/views/Vault';
import { Settings } from '@/views/Settings';

const TITLES: Record<ViewKey, { title: string; subtitle: string }> = {
  home: { title: 'Home', subtitle: 'Your day, beautifully organized.' },
  assistant: { title: 'AI Assistant', subtitle: 'Your private companion that knows your life.' },
  journal: { title: 'Journal', subtitle: 'Morning intentions, evening reflections.' },
  calendar: { title: 'Calendar', subtitle: 'Your time, in view.' },
  tasks: { title: 'Tasks', subtitle: 'What needs your attention.' },
  goals: { title: 'Goals', subtitle: 'Where you are headed.' },
  habits: { title: 'Habits', subtitle: 'Small steps, every day.' },
  projects: { title: 'Projects', subtitle: 'Your work, organized.' },
  notes: { title: 'Notes', subtitle: 'Your second brain.' },
  documents: { title: 'Documents', subtitle: 'Your files, searchable by AI.' },
  vault: { title: 'Vault', subtitle: 'Encrypted. Private. Yours alone.' },
  finance: { title: 'Finance', subtitle: 'Income, expenses, and goals.' },
  analytics: { title: 'Analytics', subtitle: 'Your patterns and progress.' },
  dev: { title: 'Dev', subtitle: 'Snippets, GitHub activity, and reachability.' },
  settings: { title: 'Settings', subtitle: 'Personalize your Life OS.' },
};

export default function App() {
  useThemeInit();
  const authStatus = useAuth((s) => s.status);
  const signOut = useAuth((s) => s.signOut);
  const notifications = useAuth((s) => s.notifications);
  const [view, setView] = useState<ViewKey>('home');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [presetQuery, setPresetQuery] = useState<string | null>(null);
  const [newTaskSignal, setNewTaskSignal] = useState(0);
  const [newNoteSignal, setNewNoteSignal] = useState(0);
  const [newJournalSignal, setNewJournalSignal] = useState(0);
  const [newEventSignal, setNewEventSignal] = useState(0);

  const navigate = useCallback((v: ViewKey) => {
    setView(v);
    setMobileOpen(false);
  }, []);

  const askAi = useCallback((q: string) => {
    setPresetQuery(null);
    setView('assistant');
    requestAnimationFrame(() => setPresetQuery(q));
  }, []);

  // Deep link from URL ?view=X (PWA shortcuts)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view') as ViewKey | null;
    if (v && v in TITLES) setView(v);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdOpen((o) => !o); }
      else if (meta && e.key === '/') { e.preventDefault(); setSearchOpen(true); }
      else if (meta && e.key.toLowerCase() === 'b') { e.preventDefault(); setCollapsed((c) => !c); }
      else if (meta && e.key.toLowerCase() === 'l') { e.preventDefault(); signOut(); }
      else if (!meta && !e.altKey && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        const map: Record<string, ViewKey> = {
          h: 'home', a: 'assistant', j: 'journal', c: 'calendar', t: 'tasks',
          g: 'goals', f: 'habits', p: 'projects', n: 'notes', d: 'documents',
          v: 'vault',
        };
        const v = map[e.key.toLowerCase()];
        if (v) { e.preventDefault(); navigate(v); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, signOut]);

  // Notification scheduler — checks every 60s
  useEffect(() => {
    if (authStatus !== 'unlocked') return;
    runScheduledNotifications(notifications);
    const id = setInterval(() => runScheduledNotifications(notifications), 60000);
    return () => clearInterval(id);
  }, [authStatus, notifications]);

  // Auto sign-out when tab is hidden for more than 5 minutes
  useEffect(() => {
    let hiddenAt: number | null = null;
    const onVis = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else if (hiddenAt && Date.now() - hiddenAt > 5 * 60 * 1000) {
        signOut();
        hiddenAt = null;
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [signOut]);

  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.remove);

  // Lock screen gate
  if (authStatus !== 'unlocked') {
    return (
      <>
        <AuthScreen />
        <Toaster toasts={toasts} remove={removeToast} />
      </>
    );
  }

  const meta = TITLES[view];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar
        current={view}
        onNavigate={navigate}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenCommand={() => setCmdOpen(true)}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenCommand={() => setCmdOpen(true)}
          onToggleMobileSidebar={() => setMobileOpen((o) => !o)}
        />

        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {view === 'home' && <Dashboard onNavigate={navigate} onAskAi={askAi} />}
              {view === 'assistant' && <Assistant presetQuery={presetQuery} />}
              {view === 'journal' && <Journal key={newJournalSignal} />}
              {view === 'tasks' && <Tasks key={newTaskSignal} />}
              {view === 'habits' && <Habits />}
              {view === 'notes' && <Notes key={newNoteSignal} />}
              {view === 'calendar' && <Calendar key={newEventSignal} />}
              {view === 'goals' && <Goals />}
              {view === 'projects' && <Projects />}
              {view === 'analytics' && <Analytics />}
              {view === 'finance' && <Finance />}
              {view === 'documents' && <Documents />}
              {view === 'dev' && <Dev />}
              {view === 'vault' && <Vault />}
              {view === 'settings' && <Settings />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onNavigate={navigate}
        onNewTask={() => { navigate('tasks'); setNewTaskSignal((s) => s + 1); }}
        onNewNote={() => { navigate('notes'); setNewNoteSignal((s) => s + 1); }}
        onNewJournal={() => { navigate('journal'); setNewJournalSignal((s) => s + 1); }}
        onNewEvent={() => { navigate('calendar'); setNewEventSignal((s) => s + 1); }}
        onAskAi={askAi}
      />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={(kind) => {
        const map: Record<string, ViewKey> = {
          task: 'tasks', note: 'notes', journal: 'journal', event: 'calendar',
          goal: 'goals', project: 'projects', document: 'documents',
        };
        const v = map[kind] ?? 'home';
        navigate(v);
      }} />
      <InstallBanner />
      <PermissionsPrompt />
      <Toaster toasts={toasts} remove={removeToast} />
    </div>
  );
}
