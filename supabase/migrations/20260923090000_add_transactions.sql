/*
# Add transactions table

## Overview
Backs the Finance view's "Add transaction" action with a real table. Until now
Finance.tsx rendered hardcoded sample data with no way to persist anything.

## New Tables
1. transactions — income/expense entries with type, amount, category, date

## Security
Follows the locked-down policy shape introduced in
`lockdown_rls_and_snippets`: `TO authenticated` only, plus a `USING`/`WITH
CHECK` match on the owner's JWT email as defense-in-depth. No `anon` access.
*/

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  category text NOT NULL DEFAULT 'Other',
  description text,
  occurred_on date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_transactions_occurred_on ON transactions(occurred_on);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

DROP TRIGGER IF EXISTS trg_transactions_updated ON transactions;
CREATE TRIGGER trg_transactions_updated BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP POLICY IF EXISTS "transactions_select" ON transactions;
CREATE POLICY "transactions_select" ON transactions FOR SELECT TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
DROP POLICY IF EXISTS "transactions_insert" ON transactions;
CREATE POLICY "transactions_insert" ON transactions FOR INSERT TO authenticated
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
DROP POLICY IF EXISTS "transactions_update" ON transactions;
CREATE POLICY "transactions_update" ON transactions FOR UPDATE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com')
  WITH CHECK ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
DROP POLICY IF EXISTS "transactions_delete" ON transactions;
CREATE POLICY "transactions_delete" ON transactions FOR DELETE TO authenticated
  USING ((select auth.jwt() ->> 'email') = 'kimanichuhi254@gmail.com');
