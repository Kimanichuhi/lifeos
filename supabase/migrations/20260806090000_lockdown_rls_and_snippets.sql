/*
# Lockdown RLS + Snippets table

## Overview
Closes a live data-exposure hole: every table's SELECT policy has allowed
the `anon` role (the public, unauthenticated key shipped in the client
bundle) to read all rows since the app's first migration. The follow-up
migration `fix_rls_policies_and_search_path` tightened INSERT/UPDATE/DELETE
to `authenticated` only but left every SELECT policy open to `anon`.

This migration replaces every CRUD policy on every table with a single
consistent, correct model:
  - `TO authenticated` only — no `anon` anywhere.
  - `USING`/`WITH CHECK` also require the JWT email to match the app's
    single owner account, as defense-in-depth beyond "has a session" (in
    case a second auth user is ever created in this project).

Also adds a `snippets` table for the new in-app code-snippet manager, using
the same locked-down policy shape from the start.

## Security
- No table in this schema is readable or writable by `anon` after this
  migration. A logged-out client (or anyone who extracts the anon key from
  the deployed bundle) gets zero rows back.
- The owner email check mirrors `OWNER_EMAIL` in `src/lib/auth.ts` — the
  single source of truth for "who is allowed to use this app."

## Important Notes
1. This does NOT touch `vault-files` storage bucket policies — those were
   already correctly scoped to `authenticated` only in the
   `vault_optimize_storage` migration.
2. Run this against the live project via the Supabase SQL editor or
   `supabase db push`. It is idempotent (DROP POLICY IF EXISTS / CREATE OR
   REPLACE throughout) and safe to re-run.
*/

-- Every policy below wraps auth.jwt() in a sub-select per Supabase's RLS
-- performance guidance, so Postgres evaluates it once per statement rather
-- than once per row.

-- ---------- snippets ----------
CREATE TABLE IF NOT EXISTS snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  language text NOT NULL DEFAULT 'text',
  code text NOT NULL,
  description text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE snippets ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_snippets_updated ON snippets;
CREATE TRIGGER trg_snippets_updated BEFORE UPDATE ON snippets
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_snippets_language ON snippets(language);

-- ---------- lockdown helper (applied per-table below) ----------
-- For every table: drop all 4 existing CRUD policies (whatever role they
-- were scoped to) and recreate them scoped to `authenticated` + owner email.

-- journal_entries
DROP POLICY IF EXISTS "je_select" ON journal_entries;
DROP POLICY IF EXISTS "je_insert" ON journal_entries;
DROP POLICY IF EXISTS "je_update" ON journal_entries;
DROP POLICY IF EXISTS "je_delete" ON journal_entries;
CREATE POLICY "je_select" ON journal_entries FOR SELECT TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "je_insert" ON journal_entries FOR INSERT TO authenticated
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "je_update" ON journal_entries FOR UPDATE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com')
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "je_delete" ON journal_entries FOR DELETE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');

-- tasks
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;
CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com')
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "tasks_delete" ON tasks FOR DELETE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');

-- habits
DROP POLICY IF EXISTS "habits_select" ON habits;
DROP POLICY IF EXISTS "habits_insert" ON habits;
DROP POLICY IF EXISTS "habits_update" ON habits;
DROP POLICY IF EXISTS "habits_delete" ON habits;
CREATE POLICY "habits_select" ON habits FOR SELECT TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "habits_insert" ON habits FOR INSERT TO authenticated
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "habits_update" ON habits FOR UPDATE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com')
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "habits_delete" ON habits FOR DELETE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');

-- habit_logs
DROP POLICY IF EXISTS "hlogs_select" ON habit_logs;
DROP POLICY IF EXISTS "hlogs_insert" ON habit_logs;
DROP POLICY IF EXISTS "hlogs_update" ON habit_logs;
DROP POLICY IF EXISTS "hlogs_delete" ON habit_logs;
CREATE POLICY "hlogs_select" ON habit_logs FOR SELECT TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "hlogs_insert" ON habit_logs FOR INSERT TO authenticated
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "hlogs_update" ON habit_logs FOR UPDATE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com')
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "hlogs_delete" ON habit_logs FOR DELETE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');

-- notes
DROP POLICY IF EXISTS "notes_select" ON notes;
DROP POLICY IF EXISTS "notes_insert" ON notes;
DROP POLICY IF EXISTS "notes_update" ON notes;
DROP POLICY IF EXISTS "notes_delete" ON notes;
CREATE POLICY "notes_select" ON notes FOR SELECT TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "notes_insert" ON notes FOR INSERT TO authenticated
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "notes_update" ON notes FOR UPDATE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com')
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "notes_delete" ON notes FOR DELETE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');

-- events
DROP POLICY IF EXISTS "events_select" ON events;
DROP POLICY IF EXISTS "events_insert" ON events;
DROP POLICY IF EXISTS "events_update" ON events;
DROP POLICY IF EXISTS "events_delete" ON events;
CREATE POLICY "events_select" ON events FOR SELECT TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "events_insert" ON events FOR INSERT TO authenticated
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "events_update" ON events FOR UPDATE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com')
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "events_delete" ON events FOR DELETE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');

-- goals
DROP POLICY IF EXISTS "goals_select" ON goals;
DROP POLICY IF EXISTS "goals_insert" ON goals;
DROP POLICY IF EXISTS "goals_update" ON goals;
DROP POLICY IF EXISTS "goals_delete" ON goals;
CREATE POLICY "goals_select" ON goals FOR SELECT TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "goals_insert" ON goals FOR INSERT TO authenticated
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "goals_update" ON goals FOR UPDATE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com')
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "goals_delete" ON goals FOR DELETE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');

-- projects
DROP POLICY IF EXISTS "projects_select" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update" ON projects;
DROP POLICY IF EXISTS "projects_delete" ON projects;
CREATE POLICY "projects_select" ON projects FOR SELECT TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "projects_insert" ON projects FOR INSERT TO authenticated
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "projects_update" ON projects FOR UPDATE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com')
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "projects_delete" ON projects FOR DELETE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');

-- ai_memories
DROP POLICY IF EXISTS "mem_select" ON ai_memories;
DROP POLICY IF EXISTS "mem_insert" ON ai_memories;
DROP POLICY IF EXISTS "mem_update" ON ai_memories;
DROP POLICY IF EXISTS "mem_delete" ON ai_memories;
CREATE POLICY "mem_select" ON ai_memories FOR SELECT TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "mem_insert" ON ai_memories FOR INSERT TO authenticated
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "mem_update" ON ai_memories FOR UPDATE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com')
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "mem_delete" ON ai_memories FOR DELETE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');

-- ai_conversations
DROP POLICY IF EXISTS "conv_select" ON ai_conversations;
DROP POLICY IF EXISTS "conv_insert" ON ai_conversations;
DROP POLICY IF EXISTS "conv_update" ON ai_conversations;
DROP POLICY IF EXISTS "conv_delete" ON ai_conversations;
CREATE POLICY "conv_select" ON ai_conversations FOR SELECT TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "conv_insert" ON ai_conversations FOR INSERT TO authenticated
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "conv_update" ON ai_conversations FOR UPDATE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com')
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "conv_delete" ON ai_conversations FOR DELETE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');

-- ai_messages
DROP POLICY IF EXISTS "msg_select" ON ai_messages;
DROP POLICY IF EXISTS "msg_insert" ON ai_messages;
DROP POLICY IF EXISTS "msg_update" ON ai_messages;
DROP POLICY IF EXISTS "msg_delete" ON ai_messages;
CREATE POLICY "msg_select" ON ai_messages FOR SELECT TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "msg_insert" ON ai_messages FOR INSERT TO authenticated
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "msg_update" ON ai_messages FOR UPDATE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com')
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "msg_delete" ON ai_messages FOR DELETE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');

-- vault_items
DROP POLICY IF EXISTS "vault_select" ON vault_items;
DROP POLICY IF EXISTS "vault_insert" ON vault_items;
DROP POLICY IF EXISTS "vault_update" ON vault_items;
DROP POLICY IF EXISTS "vault_delete" ON vault_items;
CREATE POLICY "vault_select" ON vault_items FOR SELECT TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "vault_insert" ON vault_items FOR INSERT TO authenticated
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "vault_update" ON vault_items FOR UPDATE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com')
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "vault_delete" ON vault_items FOR DELETE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');

-- snippets
DROP POLICY IF EXISTS "snippets_select" ON snippets;
DROP POLICY IF EXISTS "snippets_insert" ON snippets;
DROP POLICY IF EXISTS "snippets_update" ON snippets;
DROP POLICY IF EXISTS "snippets_delete" ON snippets;
CREATE POLICY "snippets_select" ON snippets FOR SELECT TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "snippets_insert" ON snippets FOR INSERT TO authenticated
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "snippets_update" ON snippets FOR UPDATE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com')
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
CREATE POLICY "snippets_delete" ON snippets FOR DELETE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
