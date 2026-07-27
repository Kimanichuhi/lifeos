import { supabase } from './supabase';
import type {
  AiMessage, CalendarEvent, Goal, Habit, HabitLog, JournalEntry, Note, Project, Task,
} from './types';

interface ContextData {
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  notes: Note[];
  events: CalendarEvent[];
  goals: Goal[];
  projects: Project[];
  journals: JournalEntry[];
  memories: { key: string; value: string; category: string }[];
}

async function loadContext(): Promise<ContextData> {
  const [tasks, habits, habitLogs, notes, events, goals, projects, journals, memories] = await Promise.all([
    supabase.from('tasks').select('*'),
    supabase.from('habits').select('*'),
    supabase.from('habit_logs').select('*'),
    supabase.from('notes').select('*'),
    supabase.from('events').select('*'),
    supabase.from('goals').select('*'),
    supabase.from('projects').select('*'),
    supabase.from('journal_entries').select('*').order('entry_date', { ascending: false }).limit(30),
    supabase.from('ai_memories').select('key,value,category'),
  ]);
  return {
    tasks: tasks.data ?? [],
    habits: habits.data ?? [],
    habitLogs: habitLogs.data ?? [],
    notes: notes.data ?? [],
    events: events.data ?? [],
    goals: goals.data ?? [],
    projects: projects.data ?? [],
    journals: journals.data ?? [],
    memories: memories.data ?? [],
  };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isToday(dateStr: string | null) {
  return !!dateStr && dateStr === todayStr();
}

function isThisWeek(dateStr: string | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return d >= start && d < end;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Streak: consecutive days up to today with completed logs
function habitStreak(habitId: string, logs: HabitLog[]) {
  const set = new Set(
    logs.filter((l) => l.habit_id === habitId && l.completed).map((l) => l.log_date),
  );
  let streak = 0;
  const d = new Date();
  // allow today to be uncompleted but still count from yesterday
  if (!set.has(d.toISOString().slice(0, 10))) {
    d.setDate(d.getDate() - 1);
  }
  while (set.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function buildBrief(ctx: ContextData): string {
  const todayTasks = ctx.tasks.filter((t) => isToday(t.due_date) && t.status !== 'completed' && t.status !== 'cancelled');
  const todayEvents = ctx.events.filter((e) => isToday(e.start_time.slice(0, 10)));
  const activeGoals = ctx.goals.filter((g) => g.status === 'active');
  const topHabit = ctx.habits.map((h) => ({ h, streak: habitStreak(h.id, ctx.habitLogs) })).sort((a, b) => b.streak - a.streak)[0];
  const tomorrowTasks = ctx.tasks.filter((t) => t.due_date === new Date(Date.now() + 86400000).toISOString().slice(0, 10));

  const lines: string[] = [];
  lines.push(`${greeting()}. Here's your day at a glance.`);
  lines.push('');
  if (todayEvents.length) {
    lines.push(`• ${todayEvents.length} ${todayEvents.length === 1 ? 'meeting' : 'meetings'} on the calendar`);
  }
  if (todayTasks.length) {
    lines.push(`• ${todayTasks.length} pending ${todayTasks.length === 1 ? 'task' : 'tasks'} for today`);
  }
  if (tomorrowTasks.length) {
    const names = tomorrowTasks.slice(0, 2).map((t) => t.title).join(', ');
    lines.push(`• ${tomorrowTasks.length} ${tomorrowTasks.length === 1 ? 'item' : 'items'} due tomorrow${names ? ` — ${names}` : ''}`);
  }
  if (topHabit && topHabit.streak > 0) {
    lines.push(`• ${topHabit.h.name} streak: ${topHabit.streak} ${topHabit.streak === 1 ? 'day' : 'days'}`);
  }
  if (activeGoals.length) {
    const near = activeGoals.filter((g) => g.target_date).sort((a, b) => (a.target_date! < b.target_date! ? -1 : 1))[0];
    if (near) lines.push(`• "${near.title}" is at ${near.progress}% progress`);
  }
  if (lines.length === 1) {
    lines.push('Your slate is clear. A great moment to plan ahead or reflect.');
  }
  lines.push('');
  lines.push('Would you like me to plan your day?');
  return lines.join('\n');
}

interface Match {
  text: string;
  score: number;
}

function searchAll(ctx: ContextData, query: string): Match[] {
  const q = query.toLowerCase();
  const results: Match[] = [];
  const push = (text: string, base: number) => {
    if (!text) return;
    const t = text.toLowerCase();
    if (t.includes(q)) results.push({ text, score: base + 1 });
  };
  ctx.journals.forEach((j) => {
    push(`Journal ${fmtDate(j.entry_date)}: ${[j.gratitude, j.wins, j.challenges, j.lessons, j.morning_goals].filter(Boolean).join(' · ')}`, 3);
  });
  ctx.notes.forEach((n) => push(`Note "${n.title}": ${n.content ?? ''}`, 2));
  ctx.tasks.forEach((t) => push(`Task: ${t.title}${t.notes ? ' — ' + t.notes : ''}`, 2));
  ctx.projects.forEach((p) => push(`Project: ${p.name} — ${p.description ?? ''}`, 2));
  ctx.goals.forEach((g) => push(`Goal: ${g.title} — ${g.description ?? ''}`, 2));
  ctx.events.forEach((e) => push(`Event: ${e.title}${e.description ? ' — ' + e.description : ''}`, 1));
  return results.sort((a, b) => b.score - a.score).slice(0, 8);
}

export async function generateReply(userText: string, history: AiMessage[]): Promise<string> {
  const ctx = await loadContext();
  const q = userText.toLowerCase().trim();

  // Greetings
  if (/^(hi|hello|hey|good morning|good evening|good afternoon)\b/.test(q) && q.length < 30) {
    return `${greeting()}! I'm your Life OS assistant. I can see your tasks, habits, calendar, goals, projects, notes, and journal. Ask me to plan your day, summarize your week, search your history, or remind you what's coming up.`;
  }

  // Daily brief / what should I work on
  if (/(what should i (work on|do)|plan my day|daily brief|today'?s plan|brief me)/.test(q)) {
    return buildBrief(ctx);
  }

  // Accomplishments this week
  if (/(what did i accomplish|accomplishments|this week|weekly summary|what have i done)/.test(q)) {
    const doneTasks = ctx.tasks.filter((t) => t.status === 'completed' && isThisWeek(t.completed_at ?? t.updated_at));
    const weekJournals = ctx.journals.filter((j) => isThisWeek(j.entry_date));
    const wins = ctx.journals.filter((j) => isThisWeek(j.entry_date) && j.wins).flatMap((j) => j.wins!.split('\n').filter(Boolean));
    const lines: string[] = ['Here is what you accomplished this week.'];
    lines.push('');
    if (doneTasks.length) {
      lines.push(`Completed ${doneTasks.length} ${doneTasks.length === 1 ? 'task' : 'tasks'}:`);
      doneTasks.slice(0, 6).forEach((t) => lines.push(`  ✓ ${t.title}`));
    }
    if (wins.length) {
      lines.push('');
      lines.push(`Wins you logged:`);
      wins.slice(0, 5).forEach((w) => lines.push(`  • ${w}`));
    }
    if (weekJournals.length) {
      lines.push('');
      lines.push(`You journaled ${weekJournals.length} ${weekJournals.length === 1 ? 'day' : 'days'} this week.`);
    }
    if (lines.length === 1) lines.push('No completed tasks or journal entries logged yet this week. Want to add one?');
    return lines.join('\n');
  }

  // Last met someone
  const personMatch = q.match(/(when did i last|last (?:met|saw|spoke to))\s+(\w+)/);
  if (personMatch) {
    const name = personMatch[2];
    const hits = searchAll(ctx, name);
    if (hits.length) {
      return `Here's what I found mentioning "${name}":\n\n${hits.slice(0, 4).map((h) => `• ${h.text}`).join('\n')}`;
    }
    return `I couldn't find anything mentioning "${name}" in your journal, notes, tasks, or events.`;
  }

  // Ideas about a topic
  const ideaMatch = q.match(/(ideas?|notes?|thoughts?)\s+(about|on|regarding)\s+(.+)/);
  if (ideaMatch) {
    const topic = ideaMatch[3].trim();
    const hits = searchAll(ctx, topic);
    if (hits.length) return `Here's everything I have on "${topic}":\n\n${hits.map((h) => `• ${h.text}`).join('\n')}`;
    return `I don't have any notes, journal entries, or tasks about "${topic}" yet.`;
  }

  // Show everything related to X
  const relatedMatch = q.match(/(show (everything|all|me)|find).*(related to|about|on|with)\s+(.+)/);
  if (relatedMatch) {
    const topic = relatedMatch[4].trim();
    const hits = searchAll(ctx, topic);
    if (hits.length) return `Everything related to "${topic}":\n\n${hits.map((h) => `• ${h.text}`).join('\n')}`;
    return `Nothing found related to "${topic}".`;
  }

  // Summarize last month
  if (/(summarize|summary of) (last|this|the past) month/.test(q)) {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthJournals = ctx.journals.filter((j) => {
      const d = new Date(j.entry_date);
      return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
    });
    const done = ctx.tasks.filter((t) => {
      const d = new Date(t.completed_at ?? t.updated_at);
      return t.status === 'completed' && d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
    });
    const avgMood = monthJournals.filter((j) => j.mood).length
      ? (monthJournals.reduce((s, j) => s + (j.mood ?? 0), 0) / monthJournals.filter((j) => j.mood).length).toFixed(1)
      : null;
    const lines = [`Summary of ${lastMonth.toLocaleDateString([], { month: 'long' })}:`];
    lines.push('');
    lines.push(`• ${monthJournals.length} journal entries`);
    lines.push(`• ${done.length} completed tasks`);
    if (avgMood) lines.push(`• Average mood: ${avgMood} / 5`);
    return lines.join('\n');
  }

  // Generate tomorrow's schedule
  if (/(generate|plan|make).*(tomorrow'?s|tmr).*(schedule|plan|day)/.test(q)) {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const ev = ctx.events.filter((e) => e.start_time.slice(0, 10) === tomorrow).sort((a, b) => a.start_time < b.start_time ? -1 : 1);
    const t = ctx.tasks.filter((t) => t.due_date === tomorrow && t.status !== 'completed');
    const lines = [`Tomorrow's plan (${fmtDate(tomorrow)}):`];
    if (ev.length) {
      lines.push('');
      lines.push('Schedule:');
      ev.forEach((e) => lines.push(`  ${fmtTime(e.start_time)} — ${e.title}`));
    }
    if (t.length) {
      lines.push('');
      lines.push('Tasks due:');
      t.forEach((task) => lines.push(`  • ${task.title} (${task.priority})`));
    }
    if (lines.length === 1) lines.push('Nothing scheduled for tomorrow yet. A clean canvas.');
    return lines.join('\n');
  }

  // What am I forgetting
  if (/(what am i forgetting|what'?s pending|remind me|upcoming)/.test(q)) {
    const upcoming = ctx.tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled' && t.due_date)
      .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1)).slice(0, 5);
    const soonEvents = ctx.events.filter((e) => new Date(e.start_time) > new Date())
      .sort((a, b) => (a.start_time < b.start_time ? -1 : 1)).slice(0, 3);
    const lines = ['Here is what is coming up:'];
    if (upcoming.length) {
      lines.push('');
      lines.push('Tasks:');
      upcoming.forEach((t) => lines.push(`  • ${t.title} — due ${fmtDate(t.due_date!)} (${t.priority})`));
    }
    if (soonEvents.length) {
      lines.push('');
      lines.push('Events:');
      soonEvents.forEach((e) => lines.push(`  • ${e.title} — ${fmtDate(e.start_time.slice(0, 10))} at ${fmtTime(e.start_time)}`));
    }
    if (lines.length === 1) lines.push('You are all caught up. Nothing pending.');
    return lines.join('\n');
  }

  // Habits
  if (/(habit|streak)/.test(q)) {
    const lines = ['Your habit progress:'];
    ctx.habits.forEach((h) => {
      const streak = habitStreak(h.id, ctx.habitLogs);
      const weekLogs = ctx.habitLogs.filter((l) => l.habit_id === h.id && isThisWeek(l.log_date) && l.completed).length;
      lines.push(`• ${h.name}: ${streak}-day streak, ${weekLogs}/${h.target_per_week} this week`);
    });
    if (lines.length === 1) lines.push('No habits set up yet.');
    return lines.join('\n');
  }

  // Goals
  if (/(goal|progress|milestone)/.test(q)) {
    const active = ctx.goals.filter((g) => g.status === 'active');
    if (!active.length) return 'You have no active goals. Add one in the Goals view to start tracking.';
    const lines = ['Your active goals:'];
    active.forEach((g) => {
      const due = g.target_date ? ` — due ${fmtDate(g.target_date)}` : '';
      lines.push(`• ${g.title} (${g.category}): ${g.progress}%${due}`);
    });
    return lines.join('\n');
  }

  // Projects
  if (/(project|poabiz|business)/.test(q)) {
    if (!ctx.projects.length) return 'No projects yet.';
    const lines = ['Your projects:'];
    ctx.projects.forEach((p) => lines.push(`• ${p.name} (${p.status}, ${p.progress}%) — ${p.description ?? ''}`));
    return lines.join('\n');
  }

  // Memory
  if (/(remember|memory|what do you know about me|my (favorite|preference))/.test(q)) {
    if (!ctx.memories.length) return "I haven't stored any long-term memories yet. As we talk, I'll remember things about you.";
    const lines = ['Here is what I remember about you:'];
    ctx.memories.forEach((m) => lines.push(`• ${m.key}: ${m.value}`));
    return lines.join('\n');
  }

  // Generic search fallback
  const hits = searchAll(ctx, q);
  if (hits.length) {
    return `Here is what I found related to "${userText}":\n\n${hits.map((h) => `• ${h.text}`).join('\n')}`;
  }

  // Default helpful response
  return `I can help with planning your day, summarizing your week, searching your journal and notes, tracking habits and goals, and reminding you what's coming up. Try asking "What should I work on today?" or "Show everything related to PoaBiz."`;
}

export async function generateTitle(firstMessage: string): Promise<string> {
  const trimmed = firstMessage.slice(0, 40).trim();
  return trimmed.length < firstMessage.length ? `${trimmed}…` : trimmed;
}
