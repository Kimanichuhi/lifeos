/*
# Vault — store only what's necessary

## Overview
Two cleanups to the vault_items table:

1. Drops the plaintext `title` column. It was kept for backward compatibility
   when titles moved to encrypted_title/title_iv, but every insert since has
   written the same hardcoded placeholder ("Encrypted item") — it carries no
   real information anymore.

2. Moves document/picture content out of the table and into a private
   Supabase Storage bucket (`vault-files`). Previously the AES-GCM ciphertext
   for files was base64-encoded and stored inline in `encrypted_data` (text),
   which inflates size ~33% and bloats the Postgres table with large blobs.
   Now only a `storage_path` reference is stored in the row; the encrypted
   bytes live in Storage instead. Password/API key/note items are small and
   stay inline in `encrypted_data` as before — moving them to Storage would
   add a network round trip for no benefit.

## Modified Tables
- vault_items
  - DROP `title`
  - `encrypted_data` becomes nullable (null for document/picture rows)
  - ADD `storage_path` (text, nullable) — path within the vault-files bucket

## New Storage
- Private bucket `vault-files`. RLS restricts all access to `authenticated`
  only (no anon reads/writes) since it holds the sensitive ciphertext blobs.

## Important Notes
1. Every row must have its content somewhere: either `encrypted_data` or
   `storage_path` is required (a permissive rather than strict check, so any
   existing document/picture rows that already store base64 in
   `encrypted_data` keep working — the app falls back to reading them
   in-place; nothing is migrated automatically).
2. Text-category rows (password/api_key/note) are never stored in the
   vault-files bucket.
*/

ALTER TABLE vault_items DROP COLUMN IF EXISTS title;

ALTER TABLE vault_items
  ALTER COLUMN encrypted_data DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS storage_path text;

ALTER TABLE vault_items
  DROP CONSTRAINT IF EXISTS vault_items_has_content_chk;
ALTER TABLE vault_items
  ADD CONSTRAINT vault_items_has_content_chk
  CHECK (encrypted_data IS NOT NULL OR storage_path IS NOT NULL);

ALTER TABLE vault_items
  DROP CONSTRAINT IF EXISTS vault_items_text_no_storage_chk;
ALTER TABLE vault_items
  ADD CONSTRAINT vault_items_text_no_storage_chk
  CHECK (category NOT IN ('password','api_key','note') OR storage_path IS NULL);

-- Private bucket for encrypted vault files.
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault-files', 'vault-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "vault_files_select" ON storage.objects;
CREATE POLICY "vault_files_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vault-files');

DROP POLICY IF EXISTS "vault_files_insert" ON storage.objects;
CREATE POLICY "vault_files_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vault-files');

DROP POLICY IF EXISTS "vault_files_delete" ON storage.objects;
CREATE POLICY "vault_files_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vault-files');
