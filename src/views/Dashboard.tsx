import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, CheckSquare, Target, Flame, BookOpen, Sparkles, TrendingUp,
  Clock, Quote, ChevronRight, Sun, Cloud, CloudRain, Wind,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { hueRGB } from '@/lib/colors';
import type { LucideIcon } from 'lucide-react';
import type { CalendarEvent, Goal, Habit, HabitLog, JournalEntry, Project, Task } from '@/lib/types';
import type { ViewKey } from '@/components/Sidebar';

interface Props {
  onNavigate: (v: ViewKey) => void;
  onAskAi: (q: string) => void;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const QUOTES = [
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'What gets measured gets managed.', author: 'Peter Drucker' },
  { text: 'Discipline equals freedom.', author: 'Jocko Willink' },
  { text: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
];

export function Dashboard({ onNavigate, onAskAi }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [t, e, h, hl, g, p, j] = await Promise.all([
        supabase.from('tasks').select('*'),
        supabase.from('events').select('*'),
        supabase.from('habits').select('*'),
        supabase.from('habit_logs').select('*'),
        supabase.from('goals').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('journal_entries').select('*').order('entry_date', { ascending: false }).limit(30),
      ]);
      setTasks(t.data ?? []);
      setEvents(e.data ?? []);
      setHabits(h.data ?? []);
      setHabitLogs(hl.data ?? []);
      setGoals(g.data ?? []);
      setProjects(p.data ?? []);
      setJournals(j.data ?? []);
      setLoading(false);
    })();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks.filter((t) => t.due_date === today && t.status !== 'completed' && t.status !== 'cancelled');
  const todayEvents = events.filter((e) => e.start_time.slice(0, 10) === today).sort((a, b) => a.start_time < b.start_time ? -1 : 1);
  const activeGoals = goals.filter((g) => g.status === 'active');
  const activeProjects = projects.filter((p) => p.status === 'active');
  const completedToday = tasks.filter((t) => t.status === 'completed' && (t.completed_at ?? t.updated_at).slice(0, 10) === today);

  const habitStreak = (habitId: string) => {
    const set = new Set(habitLogs.filter((l) => l.habit_id === habitId && l.completed).map((l) => l.log_date));
    let streak = 0;
    const d = new Date();
    if (!set.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
    while (set.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1); }
    return streak;
  };

  const journalStreak = useMemo(() => {
    const dates = new Set(journals.map((j) => j.entry_date));
    let streak = 0;
    const d = new Date();
    if (!dates.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
    while (dates.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1); }
    return streak;
  }, [journals]);

  const quote = useMemo(() => QUOTES[new Date().getDate() % QUOTES.length], []);

  const brief = useMemo(() => {
    const lines: string[] = [];
    const h = new Date().getHours();
    const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';
    lines.push(`${greeting}. Here's your day at a glance.`);
    if (todayEvents.length) lines.push(`• ${todayEvents.length} ${todayEvents.length === 1 ? 'meeting' : 'meetings'} on the calendar`);
    if (todayTasks.length) lines.push(`• ${todayTasks.length} pending ${todayTasks.length === 1 ? 'task' : 'tasks'} for today`);
    if (completedToday.length) lines.push(`• ${completedToday.length} already completed — nice work`);
    const topHabit = habits.map((h) => ({ h, s: habitStreak(h.id) })).sort((a, b) => b.s - a.s)[0];
    if (topHabit && topHabit.s > 0) lines.push(`• ${topHabit.h.name} streak: ${topHabit.s} days`);
    if (lines.length === 1) lines.push('Your slate is clear. A great moment to plan ahead or reflect.');
    return lines.join('\n');
  }, [todayTasks, todayEvents, completedToday, habits, habitLogs]);

  const cardCls = 'card p-5';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      {/* Hero brief */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent-600 to-accent-800 text-white p-7 sm:p-9 shadow-glow mb-6"
      >
        <div className="absolute -right-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -right-20 top-20 size-40 rounded-full bg-white/5 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-white/80 text-sm font-medium mb-2">
            <Sparkles size={16} />
            AI Daily Brief
          </div>
          <p className="text-lg sm:text-xl font-display font-semibold whitespace-pre-line leading-relaxed max-w-2xl text-balance">
            {loading ? 'Reading your day…' : brief}
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <button onClick={() => onAskAi('What should I work on today?')} className="btn bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-sm">
              <Sparkles size={15} /> Plan my day
            </button>
            <button onClick={() => onNavigate('assistant')} className="btn bg-white/10 hover:bg-white/20 text-white border border-white/20">
              Ask assistant
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Today's schedule */}
        <div className={`${cardCls} lg:col-span-2`} style={{ borderTop: `3px solid ${hueRGB('sky')}` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} style={{ color: hueRGB('sky') }} />
              <h3 className="font-display font-semibold">Today's Schedule</h3>
            </div>
            <button onClick={() => onNavigate('calendar')} className="text-xs text-slate-400 hover:text-accent-500 flex items-center gap-1">
              Calendar <ChevronRight size={13} />
            </button>
          </div>
          <div className="space-y-2">
            {todayEvents.length === 0 && !loading && (
              <p className="text-sm text-slate-400 py-6 text-center">No events scheduled for today.</p>
            )}
            {todayEvents.map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                <div className="text-xs font-mono text-slate-400 w-14 shrink-0">{fmtTime(e.start_time)}</div>
                <div className={`size-2.5 rounded-full shrink-0 ${categoryColor(e.category)}`} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{e.title}</div>
                  {e.location && <div className="text-xs text-slate-400 truncate">{e.location}</div>}
                </div>
                <div className="text-xs text-slate-400 hidden sm:block">{fmtTime(e.end_time)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Weather + quote */}
        <div className="space-y-4">
          <div className={`${cardCls} bg-gradient-to-br from-sky-500 to-cyan-600 text-white`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white/80 text-xs font-medium">Nairobi</div>
                <div className="text-3xl font-display font-bold">21°</div>
                <div className="text-white/80 text-xs">Partly cloudy</div>
              </div>
              <Cloud size={48} className="opacity-80" />
            </div>
            <div className="flex gap-3 mt-4 text-xs text-white/80">
              <span className="flex items-center gap-1"><Sun size={13} /> 24°</span>
              <span className="flex items-center gap-1"><CloudRain size={13} /> 18°</span>
              <span className="flex items-center gap-1"><Wind size={13} /> 12 km/h</span>
            </div>
          </div>
          <div className={cardCls}>
            <Quote size={18} className="text-accent-500 mb-2" />
            <p className="text-sm font-medium leading-relaxed text-balance">"{quote.text}"</p>
            <p className="text-xs text-slate-400 mt-2">— {quote.author}</p>
          </div>
        </div>

        {/* Priority tasks */}
        <div className={cardCls} style={{ borderTop: `3px solid ${hueRGB('emerald')}` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare size={18} style={{ color: hueRGB('emerald') }} />
              <h3 className="font-display font-semibold">Priority Tasks</h3>
            </div>
            <button onClick={() => onNavigate('tasks')} className="text-xs text-slate-400 hover:text-accent-500 flex items-center gap-1">
              All tasks <ChevronRight size={13} />
            </button>
          </div>
          <div className="space-y-1.5">
            {todayTasks.length === 0 && !loading && <p className="text-sm text-slate-400 py-4 text-center">No pending tasks for today.</p>}
            {todayTasks.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <span className={`size-2 rounded-full ${priorityColor(t.priority)}`} />
                <span className="text-sm flex-1 truncate">{t.title}</span>
                <span className="text-[10px] uppercase tracking-wide text-slate-400">{t.priority}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Habit progress */}
        <div className={cardCls} style={{ borderTop: `3px solid ${hueRGB('orange')}` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame size={18} style={{ color: hueRGB('orange') }} />
              <h3 className="font-display font-semibold">Habit Progress</h3>
            </div>
            <button onClick={() => onNavigate('habits')} className="text-xs text-slate-400 hover:text-accent-500 flex items-center gap-1">
              Habits <ChevronRight size={13} />
            </button>
          </div>
          <div className="space-y-3">
            {habits.slice(0, 4).map((h) => {
              const streak = habitStreak(h.id);
              const weekCount = habitLogs.filter((l) => l.habit_id === h.id && l.completed && l.log_date >= new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)).length;
              return (
                <div key={h.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{h.name}</span>
                    <span className="text-xs text-slate-400">{streak}d streak · {weekCount}/{h.target_per_week}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (weekCount / h.target_per_week) * 100)}%`, background: hueRGB('orange') }} />
                  </div>
                </div>
              );
            })}
            {habits.length === 0 && !loading && <p className="text-sm text-slate-400 py-4 text-center">No habits yet.</p>}
          </div>
        </div>

        {/* Goals progress */}
        <div className={cardCls} style={{ borderTop: `3px solid ${hueRGB('amber')}` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target size={18} style={{ color: hueRGB('amber') }} />
              <h3 className="font-display font-semibold">Goals</h3>
            </div>
            <button onClick={() => onNavigate('goals')} className="text-xs text-slate-400 hover:text-accent-500 flex items-center gap-1">
              Goals <ChevronRight size={13} />
            </button>
          </div>
          <div className="space-y-3">
            {activeGoals.slice(0, 3).map((g) => (
              <div key={g.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium truncate">{g.title}</span>
                  <span className="text-xs text-slate-400">{g.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${g.progress}%`, background: hueRGB('amber') }} />
                </div>
              </div>
            ))}
            {activeGoals.length === 0 && !loading && <p className="text-sm text-slate-400 py-4 text-center">No active goals.</p>}
          </div>
        </div>

        {/* Journal streak + recent memories */}
        <div className={`${cardCls} lg:col-span-2`} style={{ borderTop: `3px solid ${hueRGB('rose')}` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen size={18} style={{ color: hueRGB('rose') }} />
              <h3 className="font-display font-semibold">Journal & Memories</h3>
            </div>
            <button onClick={() => onNavigate('journal')} className="text-xs text-slate-400 hover:text-accent-500 flex items-center gap-1">
              Journal <ChevronRight size={13} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Stat label="Journal streak" value={`${journalStreak}d`} icon={Flame} hue="orange" />
            <Stat label="Entries (30d)" value={`${journals.length}`} icon={BookOpen} hue="rose" />
            <Stat label="Tasks done today" value={`${completedToday.length}`} icon={CheckSquare} hue="emerald" />
            <Stat label="Active projects" value={`${activeProjects.length}`} icon={TrendingUp} hue="cyan" />
          </div>
          <div className="text-xs text-slate-400 mb-1.5">Recent journal</div>
          <div className="space-y-1.5">
            {journals.slice(0, 3).map((j) => (
              <button key={j.id} onClick={() => onNavigate('journal')} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left">
                <div className="text-xs font-mono text-slate-400 w-20 shrink-0">{j.entry_date}</div>
                <div className="text-sm truncate flex-1">{j.gratitude || j.wins || j.morning_goals || 'Empty entry'}</div>
                {j.mood && <div className="text-xs">{'●'.repeat(j.mood)}</div>}
              </button>
            ))}
            {journals.length === 0 && !loading && <p className="text-sm text-slate-400 py-4 text-center">No journal entries yet.</p>}
          </div>
        </div>

        {/* Focus timer */}
        <div className={cardCls} style={{ borderTop: `3px solid ${hueRGB('violet')}` }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} style={{ color: hueRGB('violet') }} />
            <h3 className="font-display font-semibold">Focus Timer</h3>
          </div>
          <FocusTimer />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, hue }: { label: string; value: string; icon: LucideIcon; hue: Parameters<typeof hueRGB>[0] }) {
  return (
    <div className="rounded-xl p-3" style={{ background: hueRGB(hue, 0.08) }}>
      <div className="flex items-center gap-1.5 text-[11px] mb-1" style={{ color: hueRGB(hue) }}>
        <Icon size={12} /> {label}
      </div>
      <div className="font-display font-bold text-xl">{value}</div>
    </div>
  );
}

function FocusTimer() {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return (
    <div className="flex flex-col items-center">
      <div className="relative size-36 grid place-items-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-100 dark:text-slate-800" />
          <circle
            cx="50" cy="50" r="44" fill="none" stroke={hueRGB('violet')} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 44}
            strokeDashoffset={2 * Math.PI * 44 * (1 - seconds / (25 * 60))}
          />
        </svg>
        <div className="font-mono font-bold text-2xl">{mm}:{ss}</div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={() => setRunning((r) => !r)} className="btn-primary">
          {running ? 'Pause' : 'Start'}
        </button>
        <button onClick={() => { setRunning(false); setSeconds(25 * 60); }} className="btn-ghost">Reset</button>
      </div>
    </div>
  );
}

function categoryColor(c: string) {
  const map: Record<string, string> = {
    work: 'bg-blue-500', personal: 'bg-emerald-500', church: 'bg-violet-500',
    business: 'bg-amber-500', family: 'bg-rose-500', health: 'bg-cyan-500',
  };
  return map[c] ?? 'bg-slate-400';
}
function priorityColor(p: string) {
  const map: Record<string, string> = {
    urgent: 'bg-rose-500', high: 'bg-amber-500', medium: 'bg-blue-500', low: 'bg-slate-400',
  };
  return map[p] ?? 'bg-slate-400';
}
