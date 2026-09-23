/*
# Add vault_settings (server-backed vault salt)

## Overview
Fixes a real data-loss bug: the vault's PBKDF2 salt (crypto.ts) has only
ever been stored in this browser's localStorage. Clearing site data,
switching browsers, or moving to a new device generates a fresh random
salt, which derives a different key from the same password — every
existing vault item becomes permanently undecryptable with no warning.

The salt is not secret (only the password + salt together derive the key),
so persisting it server-side is safe and makes the vault portable across
devices/browsers the same way the rest of the app already is.

## New Tables
1. vault_settings — a single-row table holding the vault salt (base64).
   The `id boolean PRIMARY KEY DEFAULT true CHECK (id)` pattern enforces at
   most one row.

## Security
`TO authenticated` only, owner-email match, matching every other table.
Only SELECT + INSERT are allowed — no UPDATE/DELETE, so the salt can never
be silently rotated (which would orphan every already-encrypted vault item
without a re-encryption pass, the same class of bug this migration fixes).

## Important Notes
The app resolves the salt with a client-first-write pattern (see
`resolveVaultSalt` in src/lib/crypto.ts): on first login after this
migration, whatever salt is already in this browser's localStorage (if any)
is written here, preserving any vault items already encrypted with it.
Only a brand new install with no local salt generates a fresh one.
*/

CREATE TABLE IF NOT EXISTS vault_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  salt text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vault_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vault_settings_select" ON vault_settings;
CREATE POLICY "vault_settings_select" ON vault_settings FOR SELECT TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
DROP POLICY IF EXISTS "vault_settings_insert" ON vault_settings;
CREATE POLICY "vault_settings_insert" ON vault_settings FOR INSERT TO authenticated
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
