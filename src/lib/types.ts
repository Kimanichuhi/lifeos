export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'completed' | 'cancelled';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type EventCategory = 'work' | 'personal' | 'church' | 'business' | 'family' | 'health';
export type GoalCategory = 'life' | 'career' | 'business' | 'financial' | 'health' | 'learning' | 'spiritual';
export type GoalStatus = 'active' | 'paused' | 'completed';
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';
export type TransactionType = 'income' | 'expense';

export interface JournalEntry {
  id: string;
  entry_date: string;
  mood: number | null;
  sleep_hours: number | null;
  energy: number | null;
  focus: number | null;
  gratitude: string | null;
  prayer: string | null;
  morning_goals: string | null;
  wins: string | null;
  challenges: string | null;
  lessons: string | null;
  tomorrow_priorities: string | null;
  evening_mood: number | null;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  project_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  target_per_week: number;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  log_date: string;
  completed: boolean;
  created_at: string;
}

export interface Note {
  id: string;
  title: string;
  content: string | null;
  tags: string[];
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  category: EventCategory;
  location: string | null;
  all_day: boolean;
  created_at: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: GoalCategory;
  target_date: string | null;
  progress: number;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: ProjectStatus;
  progress: number;
  link: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiMemory {
  id: string;
  key: string;
  value: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface AiConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string | null;
  occurred_on: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentFile {
  id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

export interface Snippet {
  id: string;
  title: string;
  language: string;
  code: string;
  description: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}
