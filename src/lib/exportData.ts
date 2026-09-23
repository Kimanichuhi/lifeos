import { supabase } from './supabase';

// Tables a user might want to browse/export from the Data Explorer.
// Deliberately excludes vault_items: it's ciphertext keyed to the in-browser
// vault key, so exporting it out of context isn't useful and shouldn't be
// encouraged as a habit for sensitive data.
export const EXPLORABLE_TABLES = [
  'tasks', 'habits', 'habit_logs', 'notes', 'events', 'goals', 'projects',
  'journal_entries', 'snippets', 'transactions', 'documents', 'ai_memories', 'ai_conversations', 'ai_messages',
] as const;

export type ExplorableTable = (typeof EXPLORABLE_TABLES)[number];

function download(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAsJson(table: string, rows: Record<string, unknown>[]) {
  download(`${table}-${Date.now()}.json`, JSON.stringify(rows, null, 2), 'application/json');
}

export function exportAsCsv(table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    download(`${table}-${Date.now()}.csv`, '', 'text/csv');
    return;
  }
  const columns = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    columns.join(','),
    ...rows.map((r) => columns.map((c) => escape(r[c])).join(',')),
  ];
  download(`${table}-${Date.now()}.csv`, lines.join('\n'), 'text/csv');
}

export async function exportEverything() {
  const bundle: Record<string, unknown[]> = {};
  for (const table of EXPLORABLE_TABLES) {
    const { data } = await supabase.from(table).select('*');
    bundle[table] = data ?? [];
  }
  download(`lifeos-backup-${Date.now()}.json`, JSON.stringify(bundle, null, 2), 'application/json');
}
