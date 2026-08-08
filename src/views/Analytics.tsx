import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, CheckCircle2, Flame, BookOpen, Target, Clock, Sparkles,
  Table2, Download, DatabaseBackup, ArrowUpDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { EXPLORABLE_TABLES, exportAsCsv, exportAsJson, exportEverything, type ExplorableTable } from '@/lib/exportData';
import { useToast } from '@/lib/toast';
import type { Goal, Habit, HabitLog, JournalEntry, Task } from '@/lib/types';

type Tab = 'overview' | 'explorer';

export function Analytics() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="view-title">Analytics</h2>
          <p className="text-sm text-slate-400">Your patterns, progress, and momentum.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800/60 rounded-xl p-0.5">
          {(['overview', 'explorer'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize transition
                ${tab === t ? 'bg-white dark:bg-slate-900 shadow-sm text-accent-600 dark:text-accent-300' : 'text-slate-500'}`}
            >
              {t === 'overview' ? 'Overview' : 'Data Explorer'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' ? <Overview /> : <DataExplorer />}
    </div>
  );
}

function Overview() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [t, h, l, g, j] = await Promise.all([
        supabase.from('tasks').select('*'),
        supabase.from('habits').select('*'),
        supabase.from('habit_logs').select('*'),
        supabase.from('goals').select('*'),
        supabase.from('journal_entries').select('*'),
      ]);
      setTasks(t.data ?? []);
      setHabits(h.data ?? []);
      setLogs(l.data ?? []);
      setGoals(g.data ?? []);
      setJournals(j.data ?? []);
      setLoading(false);
    })();
  }, []);

  // Weekly task completion (last 8 weeks)
  const weeks = [...Array(8)].map((_, i) => {
    const end = new Date();
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 7);
    const done = tasks.filter((t) => {
      const d = new Date(t.completed_at ?? t.updated_at);
      return t.status === 'completed' && d >= start && d < end;
    }).length;
    return { label: `W${8 - i}`, done };
  }).reverse();

  const maxDone = Math.max(1, ...weeks.map((w) => w.done));

  // Mood over last 14 journal entries
  const moodEntries = journals
    .filter((j) => j.mood)
    .slice(0, 14)
    .reverse();

  // Habit completion last 7 days
  const last7 = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const done = logs.filter((l) => l.log_date === ds && l.completed).length;
    return { day: d.toLocaleDateString([], { weekday: 'short' }).slice(0, 1), done, total: habits.length };
  }).reverse();

  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const activeGoals = goals.filter((g) => g.status === 'active').length;
  const avgGoalProgress = goals.length ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0;
  const journalCount = journals.length;

  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Tasks completed" value={completedTasks} icon={CheckCircle2} color="text-emerald-500 bg-emerald-500/10" />
        <StatCard label="Active goals" value={activeGoals} icon={Target} color="text-blue-500 bg-blue-500/10" />
        <StatCard label="Avg goal progress" value={`${avgGoalProgress}%`} icon={TrendingUp} color="text-amber-500 bg-amber-500/10" />
        <StatCard label="Journal entries" value={journalCount} icon={BookOpen} color="text-violet-500 bg-violet-500/10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly task completion */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-accent-500" />
            <h3 className="font-display font-semibold">Tasks completed (8 weeks)</h3>
          </div>
          <div className="flex items-end gap-2 h-40">
            {weeks.map((w, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${(w.done / maxDone) * 100}%` }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div className="text-[10px] text-slate-400">{w.done}</div>
                <div className="w-full bg-accent-500/80 hover:bg-accent-500 rounded-t-lg transition" style={{ height: '100%' }} />
                <div className="text-[10px] text-slate-400">{w.label}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Habit completion last 7 days */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={18} className="text-accent-500" />
            <h3 className="font-display font-semibold">Habit completion (7 days)</h3>
          </div>
          <div className="flex items-end gap-2 h-40">
            {last7.map((d, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: d.total ? `${(d.done / d.total) * 100}%` : '0%' }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div className="text-[10px] text-slate-400">{d.done}/{d.total}</div>
                <div className="w-full bg-emerald-500/80 hover:bg-emerald-500 rounded-t-lg transition" style={{ height: '100%' }} />
                <div className="text-[10px] text-slate-400">{d.day}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mood trend */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-accent-500" />
            <h3 className="font-display font-semibold">Mood trend</h3>
          </div>
          {moodEntries.length === 0 ? (
            <p className="text-sm text-slate-400 py-10 text-center">No mood data yet. Journal your day to see trends.</p>
          ) : (
            <div className="flex items-end gap-1 h-32">
              {moodEntries.map((j, i) => (
                <motion.div
                  key={j.id}
                  initial={{ height: 0 }}
                  animate={{ height: `${((j.mood ?? 0) / 5) * 100}%` }}
                  transition={{ delay: i * 0.03 }}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-violet-500 to-rose-500"
                  title={`${j.entry_date}: ${j.mood}/5`}
                />
              ))}
            </div>
          )}
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>Older</span>
            <span>Recent</span>
          </div>
        </div>
      </div>

      {/* AI insight */}
      <div className="card p-5 mt-4 bg-accent-500/5 border-accent-500/20">
        <div className="flex items-center gap-2 mb-2 text-accent-600 dark:text-accent-300">
          <Sparkles size={16} />
          <span className="font-semibold text-sm">AI Insight</span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {loading ? 'Analyzing your patterns…' : generateInsight(tasks, habits, goals, journals, logs)}
        </p>
      </div>
    </>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: LucideIcon; color: string }) {
  return (
    <div className="card p-4">
      <div className={`size-9 rounded-xl grid place-items-center mb-3 ${color}`}>
        <Icon size={17} />
      </div>
      <div className="font-display font-bold text-2xl">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

function generateInsight(tasks: Task[], habits: Habit[], goals: Goal[], journals: JournalEntry[], logs: HabitLog[]): string {
  const completionRate = tasks.length ? Math.round((tasks.filter((t) => t.status === 'completed').length / tasks.length) * 100) : 0;
  const recentJournals = journals.filter((j) => {
    const d = new Date(j.entry_date);
    return d > new Date(Date.now() - 7 * 86400000);
  }).length;
  const insights: string[] = [];
  if (completionRate >= 70) insights.push(`You're completing ${completionRate}% of your tasks — strong momentum.`);
  else if (completionRate < 40 && tasks.length > 5) insights.push(`Task completion is at ${completionRate}%. Consider breaking large tasks into smaller steps.`);
  if (recentJournals >= 5) insights.push(`You journaled ${recentJournals} times this week — great reflection cadence.`);
  else if (recentJournals === 0) insights.push('No journal entries this week. A short evening reflection can boost clarity.');
  if (habits.length) {
    const recentLogs = logs.filter((l) => l.completed && l.log_date >= new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)).length;
    const possible = habits.length * 7;
    const rate = Math.round((recentLogs / possible) * 100);
    insights.push(`Habit completion this week: ${rate}%.`);
  }
  if (goals.length) {
    const nearDone = goals.filter((g) => g.progress >= 80 && g.status === 'active');
    if (nearDone.length) insights.push(`You're close to finishing "${nearDone[0].title}" — ${nearDone[0].progress}% done.`);
  }
  return insights.length ? insights.join(' ') : 'Keep going — every logged entry helps me understand you better.';
}

// ---------- Data Explorer ----------

const PAGE_SIZE = 25;

function DataExplorer() {
  const [table, setTable] = useState<ExplorableTable>('tasks');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [exportingAll, setExportingAll] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    setPage(0);
    setSortCol(null);
    supabase.from(table).select('*').then(({ data, error }) => {
      if (error) { toast.error(`Could not load ${table}`); setRows([]); }
      else setRows((data ?? []) as Record<string, unknown>[]);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  const columns = useMemo(() => (rows[0] ? Object.keys(rows[0]) : []), [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (filter.trim()) {
      const q = filter.toLowerCase();
      list = list.filter((r) => Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q)));
    }
    if (sortCol) {
      list = [...list].sort((a, b) => {
        const av = String(a[sortCol] ?? '');
        const bv = String(b[sortCol] ?? '');
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return list;
  }, [rows, filter, sortCol, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSort(col: string) {
    if (sortCol === col) setSortAsc((a) => !a);
    else { setSortCol(col); setSortAsc(true); }
  }

  async function handleExportEverything() {
    setExportingAll(true);
    try {
      await exportEverything();
      toast.success('Backup downloaded');
    } catch {
      toast.error('Backup failed');
    } finally {
      setExportingAll(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <select value={table} onChange={(e) => setTable(e.target.value as ExplorableTable)} className="input !w-auto">
            {EXPLORABLE_TABLES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter rows…"
            className="input flex-1 min-w-[160px]"
          />
          <button onClick={() => exportAsCsv(table, filtered)} className="btn-outline !py-1.5 !text-xs" disabled={filtered.length === 0}>
            <Download size={13} /> CSV
          </button>
          <button onClick={() => exportAsJson(table, filtered)} className="btn-outline !py-1.5 !text-xs" disabled={filtered.length === 0}>
            <Download size={13} /> JSON
          </button>
          <button onClick={handleExportEverything} className="btn-outline !py-1.5 !text-xs" disabled={exportingAll}>
            <DatabaseBackup size={13} /> {exportingAll ? 'Exporting…' : 'Export everything'}
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading && <div className="p-8 text-center text-sm text-slate-400">Loading…</div>}
        {!loading && rows.length === 0 && (
          <div className="p-10 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
            <Table2 size={28} className="text-slate-300 dark:text-slate-700" />
            No rows in {table}.
          </div>
        )}
        {!loading && rows.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200/70 dark:border-slate-800/70">
                    {columns.map((c) => (
                      <th key={c} className="text-left px-3 py-2 font-semibold text-slate-500 whitespace-nowrap">
                        <button onClick={() => toggleSort(c)} className="flex items-center gap-1 hover:text-accent-500">
                          {c} <ArrowUpDown size={10} className={sortCol === c ? 'text-accent-500' : 'text-slate-300'} />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      {columns.map((c) => (
                        <td key={c} className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300 max-w-[240px] truncate">
                          {formatCell(r[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200/70 dark:border-slate-800/70 text-xs text-slate-400">
              <span>{filtered.length} row{filtered.length === 1 ? '' : 's'}</span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-ghost !py-1 !px-2 !text-xs">Prev</button>
                  <span>{page + 1} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-ghost !py-1 !px-2 !text-xs">Next</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
