import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2, Plus, Trash2, Copy, Check, Github, Activity, GitBranch,
  ExternalLink, RefreshCw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createSnippet, deleteSnippet, getSnippets } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { Modal } from '@/components/Modal';
import { highlightCode, SNIPPET_LANGUAGES } from '@/lib/highlight';
import { fetchGitHubActivity, getGitHubUsername, type GitHubEvent } from '@/lib/github';
import { checkUptime, getUptimeTargets, type UptimeResult } from '@/lib/uptime';
import type { Snippet } from '@/lib/types';

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function Dev() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="view-title flex items-center gap-2">
          <Code2 size={22} className="text-accent-500" /> Dev
        </h2>
        <p className="text-sm text-slate-400">Snippets, GitHub activity, and system reachability — for the engineer running this thing.</p>
      </div>

      <SnippetsSection />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GitHubSection />
        <UptimeSection />
      </div>

      <VersionFooter />
    </div>
  );
}

function Section({ title, icon: Icon, action, children }: { title: string; icon: LucideIcon; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-accent-500" />
          <h3 className="font-display font-bold">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ---------- Snippets ----------

function SnippetsSection() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [viewing, setViewing] = useState<Snippet | null>(null);
  const toast = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await getSnippets();
    if (error) { toast.error('Could not load snippets'); setLoading(false); return; }
    setSnippets((data ?? []) as Snippet[]);
    setLoading(false);
  }

  async function remove(id: string) {
    await deleteSnippet(id);
    toast.success('Snippet deleted');
    load();
  }

  return (
    <Section
      title="Snippets"
      icon={Code2}
      action={
        <button onClick={() => setShowNew(true)} className="btn-primary !py-1.5 !text-xs">
          <Plus size={14} /> New snippet
        </button>
      }
    >
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl shimmer-bg animate-shimmer" />)}
        </div>
      )}
      {!loading && snippets.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-8">No snippets yet. Save the commands and code you keep reaching for.</p>
      )}
      {!loading && snippets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {snippets.map((s) => (
              <motion.button
                key={s.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                onClick={() => setViewing(s)}
                className="card p-3.5 text-left group hover:shadow-glow transition"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="font-display font-bold text-sm truncate">{s.title}</h4>
                  <button
                    onClick={(e) => { e.stopPropagation(); remove(s.id); }}
                    className="text-slate-300 hover:text-rose-500 transition opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <span className="chip bg-slate-100 dark:bg-slate-800/60 text-slate-500 text-[10px] font-mono">{s.language}</span>
                {s.description && <p className="text-xs text-slate-400 mt-2 line-clamp-2">{s.description}</p>}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      <NewSnippetModal open={showNew} onClose={() => setShowNew(false)} onSaved={load} />
      {viewing && <ViewSnippetModal snippet={viewing} onClose={() => setViewing(null)} />}
    </Section>
  );
}

function NewSnippetModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (open) { setTitle(''); setLanguage('typescript'); setCode(''); setDescription(''); setTags(''); }
  }, [open]);

  async function submit() {
    if (!title.trim() || !code.trim()) return;
    setSaving(true);
    const { error } = await createSnippet({
      title: title.trim(),
      language,
      code,
      description: description.trim() || null,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
    setSaving(false);
    if (error) { toast.error('Could not save snippet'); return; }
    toast.success('Snippet saved');
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Snippet" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <div className="label mb-1.5">Title</div>
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Postgres backup one-liner" className="input" />
          </div>
          <div>
            <div className="label mb-1.5">Language</div>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input">
              {SNIPPET_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <div>
          <div className="label mb-1.5">Code</div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={10}
            placeholder="Paste your snippet"
            className="input font-mono text-[13px] resize-y"
          />
        </div>
        <div>
          <div className="label mb-1.5">Description</div>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" className="input" />
        </div>
        <div>
          <div className="label mb-1.5">Tags</div>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Comma separated, optional" className="input" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving || !title.trim() || !code.trim()}>
            {saving ? 'Saving…' : 'Save snippet'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ViewSnippetModal({ snippet, onClose }: { snippet: Snippet; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const html = useMemo(() => highlightCode(snippet.code, snippet.language), [snippet.code, snippet.language]);

  function copy() {
    navigator.clipboard.writeText(snippet.code);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal open={true} onClose={onClose} title={snippet.title} size="lg">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="chip bg-slate-100 dark:bg-slate-800/60 text-slate-500 text-[10px] font-mono">{snippet.language}</span>
          <button onClick={copy} className="btn-ghost !py-1.5 !text-xs">
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {snippet.description && <p className="text-sm text-slate-500 dark:text-slate-400">{snippet.description}</p>}
        <pre className="snippet-code card p-4 overflow-x-auto"><code dangerouslySetInnerHTML={{ __html: html }} /></pre>
        {snippet.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {snippet.tags.map((t) => <span key={t} className="chip bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px]">{t}</span>)}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---------- GitHub activity ----------

function GitHubSection() {
  const username = getGitHubUsername();
  const [events, setEvents] = useState<GitHubEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (username) load(username);
  }, [username]);

  async function load(u: string) {
    setLoading(true);
    setError(null);
    try {
      setEvents(await fetchGitHubActivity(u));
    } catch {
      setError('Could not reach GitHub.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section
      title="GitHub Activity"
      icon={Github}
      action={username && (
        <button onClick={() => load(username)} className="btn-ghost !p-1.5 !rounded-lg" title="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      )}
    >
      {!username && (
        <p className="text-sm text-slate-400 text-center py-8">
          Add your GitHub username in Settings → Developer to see your recent activity here.
        </p>
      )}
      {username && error && <p className="text-sm text-rose-500 py-4">{error}</p>}
      {username && !error && (
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {loading && events.length === 0 && [...Array(4)].map((_, i) => <div key={i} className="h-10 rounded-lg shimmer-bg animate-shimmer" />)}
          {!loading && events.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No recent public activity.</p>}
          {events.map((e) => (
            <a
              key={e.id}
              href={e.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition text-sm"
            >
              <GitBranch size={13} className="text-slate-400 shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{e.summary}</span>
                <span className="text-slate-400"> — {e.repo}</span>
              </span>
              <span className="text-[10px] text-slate-400 shrink-0">{timeAgo(e.createdAt)}</span>
              <ExternalLink size={11} className="text-slate-300 shrink-0" />
            </a>
          ))}
        </div>
      )}
    </Section>
  );
}

// ---------- Uptime ----------

function UptimeSection() {
  const [results, setResults] = useState<UptimeResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { run(); }, []);

  async function run() {
    setLoading(true);
    setResults(await checkUptime(getUptimeTargets()));
    setLoading(false);
  }

  return (
    <Section
      title="Reachability"
      icon={Activity}
      action={
        <button onClick={run} className="btn-ghost !p-1.5 !rounded-lg" title="Refresh">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      }
    >
      <div className="space-y-1">
        {loading && results.length === 0 && [...Array(2)].map((_, i) => <div key={i} className="h-10 rounded-lg shimmer-bg animate-shimmer" />)}
        {results.map((r) => (
          <div key={r.url} className="flex items-center gap-2.5 p-2 rounded-lg text-sm">
            <span className={`size-2 rounded-full shrink-0 ${r.reachable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="font-medium flex-1 truncate">{r.name}</span>
            <span className="text-xs text-slate-400">{r.reachable ? `${r.latencyMs}ms` : 'unreachable'}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 mt-3">
        Reachability only — browsers can't read cross-origin status codes without CORS, so this can't distinguish a healthy 200 from a 500.
      </p>
    </Section>
  );
}

// ---------- Version footer ----------

function VersionFooter() {
  return (
    <div className="text-center text-xs text-slate-400 py-2 flex items-center justify-center gap-2">
      <span>Life OS v{__APP_VERSION__}</span>
      <span>·</span>
      <span className="font-mono">{__GIT_SHA__}</span>
    </div>
  );
}
