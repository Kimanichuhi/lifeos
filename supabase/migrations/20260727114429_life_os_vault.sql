/*
# Life OS — Vault module

## Overview
Adds a `vault_items` table for storing encrypted sensitive items (passwords,
API keys, documents, pictures) behind a user-set 6-digit PIN. The content is
encrypted client-side with AES-GCM using a key derived from the PIN via
PBKDF2. Only the ciphertext and metadata are stored server-side — the server
never sees the plaintext or the PIN.

## New Tables
1. vault_items — encrypted blobs with a category and metadata
   - id (uuid PK)
   - title (text) — user-facing label, stored in plaintext for listing
   - category (text) — password | api_key | document | picture | note
   - encrypted_data (text) — base64 of AES-GCM ciphertext (JSON payload)
   - iv (text) — base64 initialization vector for this item
   - metadata (jsonb) — optional non-sensitive hints (e.g. file type, size)
   - created_at / updated_at (timestamptz)

## Security
- RLS enabled. Single-tenant: anon + authenticated CRUD with USING(true).
- The plaintext content and PIN are NEVER sent to the server. Encryption
  happens in the browser before insert; the server only stores ciphertext.

## Important Notes
1. Title is stored in plaintext so the vault list can render without decryption.
2. encrypted_data + iv are base64 strings produced by the crypto library.
3. The PIN itself is never stored in the database — it lives only in the
   browser's session memory and a salted hash in localStorage for verification.
*/

CREATE TABLE IF NOT EXISTS vault_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'note' CHECK (category IN ('password','api_key','document','picture','note')),
  encrypted_data text NOT NULL,
  iv text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vault_select" ON vault_items;
CREATE POLICY "vault_select" ON vault_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "vault_insert" ON vault_items;
CREATE POLICY "vault_insert" ON vault_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "vault_update" ON vault_items;
CREATE POLICY "vault_update" ON vault_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "vault_delete" ON vault_items;
CREATE POLICY "vault_delete" ON vault_items FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_vault_category ON vault_items(category);

DROP TRIGGER IF EXISTS trg_vault_updated ON vault_items;
CREATE TRIGGER trg_vault_updated BEFORE UPDATE ON vault_items
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
