# Life OS

A private, single-owner personal operating system: journal, tasks, habits, goals, projects, notes, calendar, an encrypted vault, code snippets, and a life-context AI assistant. React + TypeScript + Vite + Tailwind on the frontend, Supabase (Postgres + Auth + Storage) on the backend. Installable as a PWA.

This app is scoped to exactly one account (see `OWNER_EMAIL` in `src/lib/auth.ts`) — it is not multi-tenant software.

## Local setup

```bash
npm install
cp .env.example .env   # fill in the values below
npm run dev
```

Required in `.env`:

| Variable | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `VITE_SENTRY_DSN` (optional) | Sentry project → Settings → Client Keys. Omit it and error monitoring simply stays off. |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (unit + component tests) |
| `npm run test:watch` | Vitest in watch mode |

CI (`.github/workflows/ci.yml`) runs all four gates on every push/PR to `main`. Consider turning on branch protection in GitHub settings requiring this check before merge.

## Database

Migrations live in `supabase/migrations/`. Apply them to your Supabase project via the SQL editor in the dashboard, or:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

**Important:** `20260806090000_lockdown_rls_and_snippets.sql` closes a real security hole — every table's `SELECT` policy previously allowed the `anon` role to read data without authentication. If you're picking up this project, apply that migration before anything else. After applying it, verify with a logged-out request:

```bash
curl "$VITE_SUPABASE_URL/rest/v1/journal_entries" -H "apikey: $VITE_SUPABASE_ANON_KEY"
# should return [] or a permission error, not your data
```

Also confirm in the Supabase dashboard (Settings → Database → Backups) that automated backups / point-in-time recovery are enabled — migrations don't control that, it's a project-level setting. On top of that, the Dev → Analytics → Data Explorer tab has an "Export everything" button that downloads a JSON snapshot of every table on demand, as a second, user-controlled backup you can keep wherever you like.

## Deployment

Deployed on Vercel via its GitHub integration (push to `main` → auto-deploy). `vercel.json` sets security headers (CSP, X-Frame-Options, etc.) at the edge. Set the same environment variables from `.env` in the Vercel project settings — `VITE_SENTRY_DSN` there too if you want error monitoring in production specifically.

## Security model

- Auth is Supabase email/password, restricted in the client to a single hardcoded owner email (`src/lib/auth.ts`). RLS policies additionally check the JWT email server-side — a client bug can't widen access.
- The Vault (`src/views/Vault.tsx`) encrypts everything client-side with AES-256-GCM before it touches the network; the key is derived from your account password via PBKDF2 (600k iterations) and never leaves the browser. Changing your password re-encrypts existing vault items automatically.
- Errors are caught by a top-level boundary (`src/components/ErrorBoundary.tsx`) and reported via Sentry only if `VITE_SENTRY_DSN` is set; otherwise everything just logs to the console via `src/lib/logger.ts`.

## Known follow-ups

- Dev dependencies (`vite`/`esbuild`/`vitest` toolchain) carry a handful of moderate advisories that only resolve via a Vite 5→8 major bump; deferred since it's a breaking change unrelated to the shipped bundle (`npm audit --omit=dev` is clean).
- The Dev view's "Reachability" widget checks whether a URL responds at all (via `no-cors` fetch), not its actual HTTP status — a browser can't read cross-origin status codes without CORS. Good enough for an at-a-glance widget, not a real uptime monitor.
