import { motion } from 'framer-motion';
import {
  Home, Bot, BookOpen, Calendar, CheckSquare, Target, Flame,
  FolderKanban, StickyNote, FileText, Wallet, BarChart3, Settings,
  Search, Sparkles, Moon, Sun, Monitor, Shield,
} from 'lucide-react';
import { useSettings, type AccentName, type ThemeMode } from '@/lib/theme';
import type { LucideIcon } from 'lucide-react';

export type ViewKey =
  | 'home' | 'assistant' | 'journal' | 'calendar' | 'tasks' | 'goals'
  | 'habits' | 'projects' | 'notes' | 'documents' | 'finance' | 'analytics' | 'vault' | 'settings';

interface NavItem {
  key: ViewKey;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'assistant', label: 'AI Assistant', icon: Bot },
  { key: 'journal', label: 'Journal', icon: BookOpen },
  { key: 'calendar', label: 'Calendar', icon: Calendar },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'goals', label: 'Goals', icon: Target },
  { key: 'habits', label: 'Habits', icon: Flame },
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'vault', label: 'Vault', icon: Shield },
  { key: 'finance', label: 'Finance', icon: Wallet },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: Settings },
];

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

interface SidebarProps {
  current: ViewKey;
  onNavigate: (v: ViewKey) => void;
  onOpenSearch: () => void;
  onOpenCommand: () => void;
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  current, onNavigate, onOpenSearch, onOpenCommand, collapsed, mobileOpen, onCloseMobile,
}: SidebarProps) {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const accent = useSettings((s) => s.accent);
  const setAccent = useSettings((s) => s.setAccent);

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden" onClick={onCloseMobile} />
      )}
      <motion.aside
        className={`fixed lg:sticky top-0 z-40 h-screen shrink-0 flex flex-col glass border-r transition-all duration-300
          ${collapsed ? 'lg:w-[72px]' : 'lg:w-[248px]'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          w-[248px]`}
        animate={false}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 h-16 shrink-0">
          <div className="size-9 rounded-xl bg-accent-600 text-white grid place-items-center shadow-glow shrink-0">
            <Sparkles size={18} />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="font-display font-bold text-[15px] leading-tight">Life OS</div>
              <div className="text-[11px] text-slate-400 leading-tight">Your private companion</div>
            </div>
          )}
        </div>

        {/* Search + command */}
        <div className="px-3 pb-2 space-y-1.5">
          <button onClick={onOpenSearch} className="nav-item w-full justify-between group">
            <span className="flex items-center gap-3">
              <Search size={18} />
              {!collapsed && <span>Search</span>}
            </span>
            {!collapsed && <kbd className="text-[10px] text-slate-400 font-mono">⌘/</kbd>}
          </button>
          <button onClick={onOpenCommand} className="nav-item w-full justify-between group">
            <span className="flex items-center gap-3">
              <Sparkles size={18} />
              {!collapsed && <span>Command</span>}
            </span>
            {!collapsed && <kbd className="text-[10px] text-slate-400 font-mono">⌘K</kbd>}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-2 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { onNavigate(item.key); onCloseMobile(); }}
                className={`nav-item w-full ${active ? 'nav-item-active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
                {active && !collapsed && (
                  <motion.div
                    layoutId="nav-dot"
                    className="ml-auto size-1.5 rounded-full bg-accent-500"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Theme + accent */}
        <div className="px-3 py-3 border-t border-slate-200/60 dark:border-slate-800/60 space-y-3">
          {!collapsed && (
            <>
              <div>
                <div className="label mb-1.5">Theme</div>
                <div className="flex gap-1">
                  {THEMES.map((t) => {
                    const Icon = t.icon;
                    const active = theme === t.mode;
                    return (
                      <button
                        key={t.mode}
                        onClick={() => setTheme(t.mode)}
                        className={`flex-1 grid place-items-center py-2 rounded-lg text-xs transition
                          ${active ? 'bg-accent-500/15 text-accent-600 dark:text-accent-300' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
                        title={t.label}
                      >
                        <Icon size={15} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="label mb-1.5">Accent</div>
                <div className="flex gap-1.5">
                  {ACCENTS.map((a) => (
                    <button
                      key={a.name}
                      onClick={() => setAccent(a.name)}
                      className={`size-6 rounded-full transition ${accent === a.name ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-slate-400' : ''}`}
                      style={{ background: a.color }}
                      title={a.name}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
          {collapsed && (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="btn-ghost !p-2 !rounded-lg"
                title="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
}
