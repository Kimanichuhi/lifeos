import { Menu, Search, Sparkles, Bell, Sun, Moon } from 'lucide-react';
import { useSettings } from '@/lib/theme';
import { useEffect, useState } from 'react';

interface TopbarProps {
  title: string;
  subtitle?: string;
  onOpenSearch: () => void;
  onOpenCommand: () => void;
  onToggleMobileSidebar: () => void;
}

export function Topbar({ title, subtitle, onOpenSearch, onOpenCommand, onToggleMobileSidebar }: TopbarProps) {
  const theme = useSettings((s) => s.theme);
  const toggleDark = useSettings((s) => s.toggleDark);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-20 glass border-b border-slate-200/60 dark:border-slate-800/60">
      <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
        <button onClick={onToggleMobileSidebar} className="btn-ghost !p-2 lg:hidden">
          <Menu size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display font-bold text-lg leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400 leading-tight truncate">{subtitle}</p>}
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 mr-2">
          <span>{now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          <span className="text-slate-300">·</span>
          <span>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <button onClick={onOpenSearch} className="btn-ghost !p-2" title="Search (⌘/)">
          <Search size={18} />
        </button>
        <button onClick={onOpenCommand} className="btn-ghost !p-2" title="Command palette (⌘K)">
          <Sparkles size={18} />
        </button>
        <button onClick={toggleDark} className="btn-ghost !p-2" title="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="btn-ghost !p-2 relative" title="Notifications">
          <Bell size={18} />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-rose-500" />
        </button>
      </div>
    </header>
  );
}
