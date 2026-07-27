
-- Fix mutable search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public, pg_temp;

-- Drop and recreate write policies scoped to `authenticated` only
-- (SELECT policies remain open to anon so the app can read without a session)

-- journal_entries
DROP POLICY IF EXISTS "je_insert" ON journal_entries;
CREATE POLICY "je_insert" ON journal_entries FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "je_update" ON journal_entries;
CREATE POLICY "je_update" ON journal_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "je_delete" ON journal_entries;
CREATE POLICY "je_delete" ON journal_entries FOR DELETE TO authenticated USING (true);

-- tasks
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "tasks_update" ON tasks;
CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "tasks_delete" ON tasks;
CREATE POLICY "tasks_delete" ON tasks FOR DELETE TO authenticated USING (true);

-- habits
DROP POLICY IF EXISTS "habits_insert" ON habits;
CREATE POLICY "habits_insert" ON habits FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "habits_update" ON habits;
CREATE POLICY "habits_update" ON habits FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "habits_delete" ON habits;
CREATE POLICY "habits_delete" ON habits FOR DELETE TO authenticated USING (true);

-- habit_logs
DROP POLICY IF EXISTS "hlogs_insert" ON habit_logs;
CREATE POLICY "hlogs_insert" ON habit_logs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "hlogs_update" ON habit_logs;
CREATE POLICY "hlogs_update" ON habit_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "hlogs_delete" ON habit_logs;
CREATE POLICY "hlogs_delete" ON habit_logs FOR DELETE TO authenticated USING (true);

-- notes
DROP POLICY IF EXISTS "notes_insert" ON notes;
CREATE POLICY "notes_insert" ON notes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "notes_update" ON notes;
CREATE POLICY "notes_update" ON notes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "notes_delete" ON notes;
CREATE POLICY "notes_delete" ON notes FOR DELETE TO authenticated USING (true);

-- events
DROP POLICY IF EXISTS "events_insert" ON events;
CREATE POLICY "events_insert" ON events FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "events_update" ON events;
CREATE POLICY "events_update" ON events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "events_delete" ON events;
CREATE POLICY "events_delete" ON events FOR DELETE TO authenticated USING (true);

-- goals
DROP POLICY IF EXISTS "goals_insert" ON goals;
CREATE POLICY "goals_insert" ON goals FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "goals_update" ON goals;
CREATE POLICY "goals_update" ON goals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "goals_delete" ON goals;
CREATE POLICY "goals_delete" ON goals FOR DELETE TO authenticated USING (true);

-- projects
DROP POLICY IF EXISTS "projects_insert" ON projects;
CREATE POLICY "projects_insert" ON projects FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "projects_update" ON projects;
CREATE POLICY "projects_update" ON projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "projects_delete" ON projects;
CREATE POLICY "projects_delete" ON projects FOR DELETE TO authenticated USING (true);

-- ai_memories
DROP POLICY IF EXISTS "mem_insert" ON ai_memories;
CREATE POLICY "mem_insert" ON ai_memories FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "mem_update" ON ai_memories;
CREATE POLICY "mem_update" ON ai_memories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "mem_delete" ON ai_memories;
CREATE POLICY "mem_delete" ON ai_memories FOR DELETE TO authenticated USING (true);

-- ai_conversations
DROP POLICY IF EXISTS "conv_insert" ON ai_conversations;
CREATE POLICY "conv_insert" ON ai_conversations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "conv_update" ON ai_conversations;
CREATE POLICY "conv_update" ON ai_conversations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "conv_delete" ON ai_conversations;
CREATE POLICY "conv_delete" ON ai_conversations FOR DELETE TO authenticated USING (true);

-- ai_messages
DROP POLICY IF EXISTS "msg_insert" ON ai_messages;
CREATE POLICY "msg_insert" ON ai_messages FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "msg_update" ON ai_messages;
CREATE POLICY "msg_update" ON ai_messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "msg_delete" ON ai_messages;
CREATE POLICY "msg_delete" ON ai_messages FOR DELETE TO authenticated USING (true);

-- vault_items
DROP POLICY IF EXISTS "vault_insert" ON vault_items;
CREATE POLICY "vault_insert" ON vault_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "vault_update" ON vault_items;
CREATE POLICY "vault_update" ON vault_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "vault_delete" ON vault_items;
CREATE POLICY "vault_delete" ON vault_items FOR DELETE TO authenticated USING (true);
