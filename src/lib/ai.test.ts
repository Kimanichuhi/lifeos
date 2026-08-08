import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ai.ts pulls in the real Supabase client via `./supabase`, which throws if
// VITE_SUPABASE_URL isn't set (it isn't, under test). Replace it with an
// in-memory fixture table keyed by table name, mimicking just enough of the
// PostgREST query builder chain (`select().order().limit()`) that
// loadContext() in ai.ts can await it.
const fixtures: Record<string, unknown[]> = {};

function makeQuery(data: unknown[]) {
  const query = {
    select: () => query,
    order: () => query,
    limit: () => query,
    eq: () => query,
    then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data, error: null }),
  };
  return query;
}

vi.mock('./supabase', () => ({
  supabase: {
    from: (table: string) => makeQuery(fixtures[table] ?? []),
  },
}));

const { generateReply } = await import('./ai');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-06T09:00:00Z'));
  Object.keys(fixtures).forEach((k) => delete fixtures[k]);
  fixtures.tasks = [];
  fixtures.habits = [];
  fixtures.habit_logs = [];
  fixtures.notes = [];
  fixtures.events = [];
  fixtures.goals = [];
  fixtures.projects = [];
  fixtures.journal_entries = [];
  fixtures.ai_memories = [];
});

afterEach(() => {
  vi.useRealTimers();
});

describe('generateReply', () => {
  it('greets on a plain hello', async () => {
    const reply = await generateReply('hello', []);
    expect(reply).toMatch(/Life OS assistant/);
  });

  it('summarizes today\'s pending tasks in the daily brief', async () => {
    fixtures.tasks = [
      { id: '1', title: 'Ship the RLS fix', status: 'todo', priority: 'urgent', due_date: '2026-08-06', notes: null, project_id: null, completed_at: null, created_at: '', updated_at: '' },
    ];
    const reply = await generateReply('what should I work on today?', []);
    expect(reply).toMatch(/1 pending task/);
  });

  it('reports habit streaks, counting a still-open today as continuing yesterday\'s streak', async () => {
    fixtures.habits = [{ id: 'h1', name: 'Read', description: null, icon: 'Check', color: 'emerald', target_per_week: 7, created_at: '' }];
    fixtures.habit_logs = [
      { id: 'l1', habit_id: 'h1', log_date: '2026-08-05', completed: true, created_at: '' },
      { id: 'l2', habit_id: 'h1', log_date: '2026-08-04', completed: true, created_at: '' },
    ];
    const reply = await generateReply('show my habit streaks', []);
    expect(reply).toMatch(/Read: 2-day streak/);
  });

  it('lists active goals with progress', async () => {
    fixtures.goals = [
      { id: 'g1', title: 'Ship production hardening', description: null, category: 'career', target_date: null, progress: 60, status: 'active', created_at: '', updated_at: '' },
    ];
    const reply = await generateReply('what are my goals?', []);
    expect(reply).toMatch(/Ship production hardening \(career\): 60%/);
  });

  it('falls back to a helpful default for unrecognized input', async () => {
    const reply = await generateReply('xyzzy plugh', []);
    expect(reply).toMatch(/I can help with/);
  });
});
