/*
# Add documents table + storage bucket

## Overview
Backs the Documents view's upload/preview/share flow with real storage.
Until now Documents.tsx rendered a hardcoded file list with no backing data.

## New Tables
1. documents — file metadata (name, storage path, mime type, size)

## New Storage
- Private bucket `documents`. Unlike `vault-files`, content here is stored
  as-is (not client-side encrypted) since these files need to be inline-
  previewable (images/PDFs) and shareable via a signed link — encrypting
  them would defeat both. RLS still restricts all bucket access to
  `authenticated` only, matching `vault-files`.

## Security
`documents` table follows the locked-down policy shape from
`lockdown_rls_and_snippets`: `TO authenticated` only, plus a `USING`/`WITH
CHECK` match on the owner's JWT email as defense-in-depth. No `anon` access
anywhere, on the table or the bucket.
*/

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  file_size bigint NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);

DROP POLICY IF EXISTS "documents_select" ON documents;
CREATE POLICY "documents_select" ON documents FOR SELECT TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
DROP POLICY IF EXISTS "documents_insert" ON documents;
CREATE POLICY "documents_insert" ON documents FOR INSERT TO authenticated
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
DROP POLICY IF EXISTS "documents_delete" ON documents;
CREATE POLICY "documents_delete" ON documents FOR DELETE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');

-- Private bucket for uploaded document files.
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "documents_files_select" ON storage.objects;
CREATE POLICY "documents_files_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_files_insert" ON storage.objects;
CREATE POLICY "documents_files_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_files_delete" ON storage.objects;
CREATE POLICY "documents_files_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents');
