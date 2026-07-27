/*
# Vault — encrypt titles

## Overview
Adds `encrypted_title` and `title_iv` columns to `vault_items` so that item
titles can also be encrypted client-side. The existing plaintext `title`
column is retained for backward compatibility but will be set to a generic
label ("Encrypted item") for new items — the real title lives in
`encrypted_title` and is only readable after decryption with the vault key.

## Modified Tables
- vault_items
  - encrypted_title (text, nullable) — base64 AES-GCM ciphertext of the title
  - title_iv (text, nullable) — base64 IV for the title encryption

## Security
- No change to RLS policies. The new columns are covered by the existing
  permissive single-tenant policies.

## Important Notes
1. Existing rows will have NULL encrypted_title — the app falls back to the
   plaintext `title` for those.
2. New rows store a generic label in `title` and the real title in
   `encrypted_title`.
*/

ALTER TABLE vault_items
  ADD COLUMN IF NOT EXISTS encrypted_title text,
  ADD COLUMN IF NOT EXISTS title_iv text;
