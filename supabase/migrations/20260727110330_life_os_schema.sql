/*
# Life OS — Core Schema (single-tenant, no auth)

## Overview
Creates the foundational tables for a personal Life Operating System: journal,
tasks, habits, notes, calendar events, goals, projects, AI memory, and AI
conversation history. Single-tenant: no user_id, no auth.users FK. Policies
allow anon + authenticated CRUD because the data is intentionally private to
this one installation.

## New Tables
1. journal_entries — daily journal pages (morning + evening reflection)
2. tasks — to-do items with status, priority, due date, project link
3. habits — habit definitions with target frequency
4. habit_logs — per-day completion records for habits
5. notes — second-brain notes with tags + pinned flag
6. events — calendar events with category, location, time range
7. goals — life goals with category, target date, progress
8. projects — project hub with status, progress, color
9. ai_memories — long-term AI memory key/value store
10. ai_conversations — AI chat conversation threads
11. ai_messages — individual messages within a conversation

## Security
- RLS enabled on every table.
- 4 CRUD policies (select/insert/update/delete) per table, scoped to
  `TO anon, authenticated` with `USING (true)` because this is a single-tenant
  app with no sign-in screen — the anon-key client must read/write its own data.

## Important Notes
1. All tables use `gen_random_uuid()` for primary keys.
2. Timestamps default to `now()`.
3. `habit_logs` has a unique constraint on (habit_id, log_date) to prevent duplicates.
4. `ai_messages` cascades on delete with its parent conversation.
*/

CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL UNIQUE,
  mood int CHECK (mood >= 1 AND mood <= 5),
  sleep_hours numeric(4,1),
  energy int CHECK (energy >= 1 AND energy <= 5),
  focus int CHECK (focus >= 1 AND focus <= 5),
  gratitude text,
  prayer text,
  morning_goals text,
  wins text,
  challenges text,
  lessons text,
  tomorrow_priorities text,
  evening_mood int CHECK (evening_mood >= 1 AND evening_mood <= 5),
  ai_summary text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','waiting','completed','cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent','high','medium','low')),
  due_date date,
  project_id uuid,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text DEFAULT 'Check',
  color text DEFAULT 'emerald',
  target_per_week int DEFAULT 7,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  completed boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (habit_id, log_date)
);

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled',
  content text,
  tags text[] DEFAULT '{}',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  category text NOT NULL DEFAULT 'personal' CHECK (category IN ('work','personal','church','business','family','health')),
  location text,
  all_day boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'life' CHECK (category IN ('life','career','business','financial','health','learning','spiritual')),
  target_date date,
  progress int NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text DEFAULT 'blue',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','on_hold','completed','archived')),
  progress int NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  value text NOT NULL,
  category text NOT NULL DEFAULT 'preference',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'New Conversation',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai_messages(conversation_id);

-- Enable RLS on all tables
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- Helper: apply 4 CRUD policies for a single-tenant table
-- Repeated per table for clarity.

-- journal_entries
DROP POLICY IF EXISTS "je_select" ON journal_entries;
CREATE POLICY "je_select" ON journal_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "je_insert" ON journal_entries;
CREATE POLICY "je_insert" ON journal_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "je_update" ON journal_entries;
CREATE POLICY "je_update" ON journal_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "je_delete" ON journal_entries;
CREATE POLICY "je_delete" ON journal_entries FOR DELETE TO anon, authenticated USING (true);

-- tasks
DROP POLICY IF EXISTS "tasks_select" ON tasks;
CREATE POLICY "tasks_select" ON tasks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "tasks_update" ON tasks;
CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "tasks_delete" ON tasks;
CREATE POLICY "tasks_delete" ON tasks FOR DELETE TO anon, authenticated USING (true);

-- habits
DROP POLICY IF EXISTS "habits_select" ON habits;
CREATE POLICY "habits_select" ON habits FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "habits_insert" ON habits;
CREATE POLICY "habits_insert" ON habits FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "habits_update" ON habits;
CREATE POLICY "habits_update" ON habits FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "habits_delete" ON habits;
CREATE POLICY "habits_delete" ON habits FOR DELETE TO anon, authenticated USING (true);

-- habit_logs
DROP POLICY IF EXISTS "hlogs_select" ON habit_logs;
CREATE POLICY "hlogs_select" ON habit_logs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "hlogs_insert" ON habit_logs;
CREATE POLICY "hlogs_insert" ON habit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "hlogs_update" ON habit_logs;
CREATE POLICY "hlogs_update" ON habit_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "hlogs_delete" ON habit_logs;
CREATE POLICY "hlogs_delete" ON habit_logs FOR DELETE TO anon, authenticated USING (true);

-- notes
DROP POLICY IF EXISTS "notes_select" ON notes;
CREATE POLICY "notes_select" ON notes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "notes_insert" ON notes;
CREATE POLICY "notes_insert" ON notes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "notes_update" ON notes;
CREATE POLICY "notes_update" ON notes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "notes_delete" ON notes;
CREATE POLICY "notes_delete" ON notes FOR DELETE TO anon, authenticated USING (true);

-- events
DROP POLICY IF EXISTS "events_select" ON events;
CREATE POLICY "events_select" ON events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "events_insert" ON events;
CREATE POLICY "events_insert" ON events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "events_update" ON events;
CREATE POLICY "events_update" ON events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "events_delete" ON events;
CREATE POLICY "events_delete" ON events FOR DELETE TO anon, authenticated USING (true);

-- goals
DROP POLICY IF EXISTS "goals_select" ON goals;
CREATE POLICY "goals_select" ON goals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "goals_insert" ON goals;
CREATE POLICY "goals_insert" ON goals FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "goals_update" ON goals;
CREATE POLICY "goals_update" ON goals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "goals_delete" ON goals;
CREATE POLICY "goals_delete" ON goals FOR DELETE TO anon, authenticated USING (true);

-- projects
DROP POLICY IF EXISTS "projects_select" ON projects;
CREATE POLICY "projects_select" ON projects FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "projects_insert" ON projects;
CREATE POLICY "projects_insert" ON projects FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "projects_update" ON projects;
CREATE POLICY "projects_update" ON projects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "projects_delete" ON projects;
CREATE POLICY "projects_delete" ON projects FOR DELETE TO anon, authenticated USING (true);

-- ai_memories
DROP POLICY IF EXISTS "mem_select" ON ai_memories;
CREATE POLICY "mem_select" ON ai_memories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "mem_insert" ON ai_memories;
CREATE POLICY "mem_insert" ON ai_memories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "mem_update" ON ai_memories;
CREATE POLICY "mem_update" ON ai_memories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "mem_delete" ON ai_memories;
CREATE POLICY "mem_delete" ON ai_memories FOR DELETE TO anon, authenticated USING (true);

-- ai_conversations
DROP POLICY IF EXISTS "conv_select" ON ai_conversations;
CREATE POLICY "conv_select" ON ai_conversations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "conv_insert" ON ai_conversations;
CREATE POLICY "conv_insert" ON ai_conversations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "conv_update" ON ai_conversations;
CREATE POLICY "conv_update" ON ai_conversations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "conv_delete" ON ai_conversations;
CREATE POLICY "conv_delete" ON ai_conversations FOR DELETE TO anon, authenticated USING (true);

-- ai_messages
DROP POLICY IF EXISTS "msg_select" ON ai_messages;
CREATE POLICY "msg_select" ON ai_messages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "msg_insert" ON ai_messages;
CREATE POLICY "msg_insert" ON ai_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "msg_update" ON ai_messages;
CREATE POLICY "msg_update" ON ai_messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "msg_delete" ON ai_messages;
CREATE POLICY "msg_delete" ON ai_messages FOR DELETE TO anon, authenticated USING (true);

-- updated_at triggers
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_journal_updated ON journal_entries;
CREATE TRIGGER trg_journal_updated BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_tasks_updated ON tasks;
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_notes_updated ON notes;
CREATE TRIGGER trg_notes_updated BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_goals_updated ON goals;
CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated ON projects;
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_mem_updated ON ai_memories;
CREATE TRIGGER trg_mem_updated BEFORE UPDATE ON ai_memories
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_conv_updated ON ai_conversations;
CREATE TRIGGER trg_conv_updated BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
