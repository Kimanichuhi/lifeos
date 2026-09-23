import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type {
  CalendarEvent, DocumentFile, Goal, Habit, HabitLog, JournalEntry, Note, Project, Task, Transaction,
} from './types';

export function useSupabaseQuery<T>(
  table: string,
  select = '*',
  deps: unknown[] = [],
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data: rows, error: err } = await supabase.from(table).select(select);
    if (err) setError(err.message);
    else setData(rows as T[]);
    setLoading(false);
  }, [table, select]);

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, select, ...deps]);

  return { data, loading, error, refetch };
}

export function useTasks() {
  return useSupabaseQuery<Task>('tasks');
}
export function useHabits() {
  return useSupabaseQuery<Habit>('habits');
}
export function useHabitLogs() {
  return useSupabaseQuery<HabitLog>('habit_logs');
}
export function useNotes() {
  return useSupabaseQuery<Note>('notes');
}
export function useEvents() {
  return useSupabaseQuery<CalendarEvent>('events');
}
export function useGoals() {
  return useSupabaseQuery<Goal>('goals');
}
export function useProjects() {
  return useSupabaseQuery<Project>('projects');
}
export function useJournalEntries() {
  return useSupabaseQuery<JournalEntry>('journal_entries');
}
export function useTransactions() {
  return useSupabaseQuery<Transaction>('transactions');
}
export function useDocuments() {
  return useSupabaseQuery<DocumentFile>('documents');
}
