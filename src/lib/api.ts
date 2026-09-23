import { supabase } from './supabase';
import type {
  AiConversation, AiMessage, AiMemory, CalendarEvent, DocumentFile, Goal, Habit, HabitLog,
  JournalEntry, Note, Project, Snippet, Task, Transaction,
} from './types';

// ---------- Tasks ----------
export async function createTask(input: Partial<Task>) {
  return supabase.from('tasks').insert(input).select().single();
}
export async function updateTask(id: string, patch: Partial<Task>) {
  return supabase.from('tasks').update(patch).eq('id', id);
}
export async function deleteTask(id: string) {
  return supabase.from('tasks').delete().eq('id', id);
}

// ---------- Habits ----------
export async function createHabit(input: Partial<Habit>) {
  return supabase.from('habits').insert(input).select().single();
}
export async function updateHabit(id: string, patch: Partial<Habit>) {
  return supabase.from('habits').update(patch).eq('id', id);
}
export async function deleteHabit(id: string) {
  return supabase.from('habits').delete().eq('id', id);
}
export async function toggleHabitLog(habitId: string, date: string, completed: boolean) {
  if (completed) {
    return supabase.from('habit_logs').insert({ habit_id: habitId, log_date: date, completed: true });
  }
  return supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('log_date', date);
}
export async function getHabitLogs(habitId: string) {
  return supabase.from('habit_logs').select('*').eq('habit_id', habitId);
}

// ---------- Notes ----------
export async function createNote(input: Partial<Note>) {
  return supabase.from('notes').insert(input).select().single();
}
export async function updateNote(id: string, patch: Partial<Note>) {
  return supabase.from('notes').update(patch).eq('id', id);
}
export async function deleteNote(id: string) {
  return supabase.from('notes').delete().eq('id', id);
}

// ---------- Events ----------
export async function createEvent(input: Partial<CalendarEvent>) {
  return supabase.from('events').insert(input).select().single();
}
export async function updateEvent(id: string, patch: Partial<CalendarEvent>) {
  return supabase.from('events').update(patch).eq('id', id);
}
export async function deleteEvent(id: string) {
  return supabase.from('events').delete().eq('id', id);
}

// ---------- Goals ----------
export async function createGoal(input: Partial<Goal>) {
  return supabase.from('goals').insert(input).select().single();
}
export async function updateGoal(id: string, patch: Partial<Goal>) {
  return supabase.from('goals').update(patch).eq('id', id);
}
export async function deleteGoal(id: string) {
  return supabase.from('goals').delete().eq('id', id);
}

// ---------- Projects ----------
export async function createProject(input: Partial<Project>) {
  return supabase.from('projects').insert(input).select().single();
}
export async function updateProject(id: string, patch: Partial<Project>) {
  return supabase.from('projects').update(patch).eq('id', id);
}
export async function deleteProject(id: string) {
  return supabase.from('projects').delete().eq('id', id);
}

// ---------- Journal ----------
export async function upsertJournal(entry: Partial<JournalEntry> & { entry_date: string }) {
  return supabase.from('journal_entries').upsert(entry, { onConflict: 'entry_date' }).select().single();
}
export async function getJournalByDate(date: string) {
  return supabase.from('journal_entries').select('*').eq('entry_date', date).maybeSingle();
}

// ---------- AI Memory ----------
export async function getMemories() {
  return supabase.from('ai_memories').select('*').order('created_at', { ascending: false });
}
export async function createMemory(input: Partial<AiMemory>) {
  return supabase.from('ai_memories').insert(input).select().single();
}
export async function updateMemory(id: string, patch: Partial<AiMemory>) {
  return supabase.from('ai_memories').update(patch).eq('id', id);
}
export async function deleteMemory(id: string) {
  return supabase.from('ai_memories').delete().eq('id', id);
}

// ---------- AI Conversations ----------
export async function getConversations() {
  return supabase.from('ai_conversations').select('*').order('updated_at', { ascending: false });
}
export async function createConversation(title = 'New Conversation') {
  return supabase.from('ai_conversations').insert({ title }).select().single();
}
export async function deleteConversation(id: string) {
  return supabase.from('ai_conversations').delete().eq('id', id);
}
export async function renameConversation(id: string, title: string) {
  return supabase.from('ai_conversations').update({ title }).eq('id', id);
}
export async function getMessages(conversationId: string) {
  return supabase.from('ai_messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
}
export async function addMessage(conversationId: string, role: 'user' | 'assistant', content: string) {
  return supabase.from('ai_messages').insert({ conversation_id: conversationId, role, content }).select().single();
}
export async function touchConversation(id: string) {
  return supabase.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', id);
}

// ---------- Snippets ----------
export async function getSnippets() {
  return supabase.from('snippets').select('*').order('updated_at', { ascending: false });
}
export async function createSnippet(input: Partial<Snippet>) {
  return supabase.from('snippets').insert(input).select().single();
}
export async function updateSnippet(id: string, patch: Partial<Snippet>) {
  return supabase.from('snippets').update(patch).eq('id', id);
}
export async function deleteSnippet(id: string) {
  return supabase.from('snippets').delete().eq('id', id);
}

// ---------- Transactions ----------
export async function createTransaction(input: Partial<Transaction>) {
  return supabase.from('transactions').insert(input).select().single();
}
export async function updateTransaction(id: string, patch: Partial<Transaction>) {
  return supabase.from('transactions').update(patch).eq('id', id);
}
export async function deleteTransaction(id: string) {
  return supabase.from('transactions').delete().eq('id', id);
}

// ---------- Documents ----------
export async function createDocument(input: Partial<DocumentFile>) {
  return supabase.from('documents').insert(input).select().single();
}
export async function deleteDocument(id: string) {
  return supabase.from('documents').delete().eq('id', id);
}

export type { AiConversation, AiMessage, AiMemory, CalendarEvent, DocumentFile, Goal, Habit, HabitLog, JournalEntry, Note, Project, Snippet, Task, Transaction };
