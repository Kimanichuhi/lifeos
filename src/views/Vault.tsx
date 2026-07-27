import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Plus, Trash2, Key, FileText, Image, StickyNote, Eye, EyeOff,
  Copy, Check, Upload, Download, Shield,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { Modal } from '@/components/Modal';
import {
  encryptString, decryptString, encryptFile, decryptToFile,
} from '@/lib/crypto';

type VaultCategory = 'password' | 'api_key' | 'document' | 'picture' | 'note';

interface VaultItem {
  id: string;
  title: string;
  encrypted_title: string | null;
  title_iv: string | null;
  category: VaultCategory;
  encrypted_data: string;
  iv: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const CATEGORIES: { key: VaultCategory; label: string; icon: typeof Key; color: string }[] = [
  { key: 'password', label: 'Passwords', icon: Key, color: 'bg-rose-500/10 text-rose-500' },
  { key: 'api_key', label: 'API Keys', icon: Key, color: 'bg-amber-500/10 text-amber-500' },
  { key: 'document', label: 'Documents', icon: FileText, color: 'bg-blue-500/10 text-blue-500' },
  { key: 'picture', label: 'Pictures', icon: Image, color: 'bg-cyan-500/10 text-cyan-500' },
  { key: 'note', label: 'Notes', icon: StickyNote, color: 'bg-emerald-500/10 text-emerald-500' },
];

function catMeta(c: string) {
  return CATEGORIES.find((x) => x.key === c) ?? CATEGORIES[4];
}

export function Vault() {
  const vaultKey = useAuth((s) => s.vaultKey);
  const status = useAuth((s) => s.status);
  const [items, setItems] = useState<(VaultItem & { decryptedTitle: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<VaultCategory | 'all'>('all');
  const [showNew, setShowNew] = useState(false);
  const [viewing, setViewing] = useState<(VaultItem & { decryptedTitle: string }) | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (vaultKey) loadItems();
  }, [vaultKey]);

  async function loadItems() {
    setLoading(true);
    const { data, error } = await supabase.from('vault_items').select('*').order('updated_at', { ascending: false });
    if (error) { toast.error('Could not load vault'); setLoading(false); return; }
    // Decrypt titles client-side
    const enriched = await Promise.all((data ?? []).map(async (item: VaultItem) => {
      let decryptedTitle = item.title;
      if (item.encrypted_title && item.title_iv && vaultKey) {
        try {
          decryptedTitle = await decryptString({ ciphertext: item.encrypted_title, iv: item.title_iv }, vaultKey);
        } catch { /* keep fallback */ }
      }
      return { ...item, decryptedTitle };
    }));
    setItems(enriched);
    setLoading(false);
  }

  async function remove(id: string) {
    await supabase.from('vault_items').delete().eq('id', id);
    loadItems();
    toast.success('Item deleted from vault');
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((i) => i.category === filter);
  }, [items, filter]);

  if (!vaultKey || status !== 'unlocked') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="text-center py-20">
          <div className="size-16 rounded-2xl bg-accent-500/10 text-accent-500 grid place-items-center mx-auto mb-4">
            <Lock size={28} />
          </div>
          <h2 className="font-display font-bold text-xl mb-2">Vault is locked</h2>
          <p className="text-sm text-slate-400">Unlock with your PIN to access your encrypted vault.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display font-bold text-2xl flex items-center gap-2">
            <Shield size={22} className="text-accent-500" /> Vault
          </h2>
          <p className="text-sm text-slate-400">Encrypted with AES-256. Only you can decrypt — not even the server.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus size={16} /> Add item
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={items.length} />
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const count = items.filter((i) => i.category === c.key).length;
          return (
            <FilterChip
              key={c.key}
              active={filter === c.key}
              onClick={() => setFilter(c.key)}
              label={c.label}
              count={count}
              icon={<Icon size={13} />}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading && [...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl shimmer-bg animate-shimmer" />)}
        <AnimatePresence>
          {filtered.map((item) => {
            const meta = catMeta(item.category);
            const Icon = meta.icon;
            return (
              <motion.button
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                onClick={() => setViewing(item)}
                className="card p-4 text-left group hover:shadow-glow transition"
              >
                <div className="flex items-start gap-3">
                  <div className={`size-10 rounded-xl grid place-items-center shrink-0 ${meta.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-semibold text-sm truncate">{item.decryptedTitle}</h3>
                    <p className="text-xs text-slate-400 capitalize mt-0.5">{item.category.replace('_', ' ')}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(item.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); remove(item.id); }}
                    className="text-slate-300 hover:text-rose-500 transition opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Shield size={40} className="text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">Your vault is empty. Add a password, API key, or document to secure it.</p>
        </div>
      )}

      <NewVaultItemModal open={showNew} onClose={() => setShowNew(false)} vaultKey={vaultKey} onSaved={loadItems} />
      {viewing && (
        <ViewVaultItemModal item={viewing} vaultKey={vaultKey} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label, count, icon }: { active: boolean; onClick: () => void; label: string; count: number; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`chip transition ${active ? 'bg-accent-500 text-white' : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
    >
      {icon}
      {label}
      <span className={`text-[10px] ${active ? 'text-white/70' : 'text-slate-400'}`}>{count}</span>
    </button>
  );
}

function NewVaultItemModal({ open, onClose, vaultKey, onSaved }: {
  open: boolean;
  onClose: () => void;
  vaultKey: CryptoKey;
  onSaved: () => void;
}) {
  const [category, setCategory] = useState<VaultCategory>('password');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [username, setUsername] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function submit() {
    if (!title.trim()) return;
    if (category === 'password' || category === 'api_key' || category === 'note') {
      if (!content.trim()) { toast.error('Content is required'); return; }
    }
    if ((category === 'document' || category === 'picture') && !file) {
      toast.error('Please select a file');
      return;
    }
    setSaving(true);
    try {
      let encrypted: { ciphertext: string; iv: string };
      let metadata: Record<string, unknown> = {};
      if (category === 'password') {
        const payload = JSON.stringify({ content, username, url });
        encrypted = await encryptString(payload, vaultKey);
        metadata = { hasUsername: !!username, hasUrl: !!url };
      } else if (category === 'api_key') {
        encrypted = await encryptString(content, vaultKey);
      } else if (category === 'note') {
        encrypted = await encryptString(content, vaultKey);
      } else {
        encrypted = await encryptFile(file!, vaultKey);
        metadata = { mimeType: file!.type, fileName: file!.name, fileSize: file!.size };
      }
      // Encrypt the title too — store a generic label in plaintext
      const encTitle = await encryptString(title.trim(), vaultKey);
      const { error } = await supabase.from('vault_items').insert({
        title: 'Encrypted item',
        encrypted_title: encTitle.ciphertext,
        title_iv: encTitle.iv,
        category,
        encrypted_data: encrypted.ciphertext,
        iv: encrypted.iv,
        metadata,
      });
      if (error) { toast.error('Could not save to vault'); return; }
      toast.success('Encrypted and saved to vault');
      setTitle(''); setContent(''); setUsername(''); setUrl(''); setFile(null);
      onSaved();
      onClose();
    } catch {
      toast.error('Encryption failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add to Vault" size="md">
      <div className="space-y-4">
        <div>
          <div className="label mb-1.5">Type</div>
          <div className="grid grid-cols-3 gap-1.5">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`chip justify-center py-2 transition ${category === c.key ? c.color + ' border' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                >
                  <Icon size={13} /> {c.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="label mb-1.5">Title</div>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Gmail, Stripe API key" className="input" />
        </div>

        {category === 'password' && (
          <>
            <div>
              <div className="label mb-1.5">Username / email</div>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Optional" className="input" />
            </div>
            <div>
              <div className="label mb-1.5">URL</div>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Optional" className="input" />
            </div>
            <div>
              <div className="label mb-1.5">Password</div>
              <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="Enter password" className="input font-mono" />
            </div>
          </>
        )}

        {category === 'api_key' && (
          <div>
            <div className="label mb-1.5">API key / secret</div>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} placeholder="Paste your API key or secret" className="input font-mono resize-y" />
          </div>
        )}

        {category === 'note' && (
          <div>
            <div className="label mb-1.5">Note content</div>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="Private note" className="input resize-y" />
          </div>
        )}

        {(category === 'document' || category === 'picture') && (
          <div>
            <div className="label mb-1.5">File</div>
            <label className="card border-2 border-dashed border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center cursor-pointer hover:border-accent-500/50 transition">
              <Upload size={22} className="text-slate-400 mb-2" />
              <span className="text-sm font-medium">{file ? file.name : 'Click to select a file'}</span>
              <span className="text-xs text-slate-400 mt-0.5">{file ? `${(file.size / 1024).toFixed(1)} KB` : 'Encrypted before upload'}</span>
              <input
                type="file"
                className="hidden"
                accept={category === 'picture' ? 'image/*' : '*/*'}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
          <Shield size={13} className="text-accent-500" />
          Encrypted on your device with AES-256 before storage.
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={saving || !title.trim()}>
            {saving ? 'Encrypting…' : 'Save to vault'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ViewVaultItemModal({ item, vaultKey, onClose }: {
  item: VaultItem & { decryptedTitle: string };
  vaultKey: CryptoKey;
  onClose: () => void;
}) {
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      try {
        if (item.category === 'password') {
          const json = await decryptString({ ciphertext: item.encrypted_data, iv: item.iv }, vaultKey);
          setDecrypted(json);
        } else if (item.category === 'api_key' || item.category === 'note') {
          const text = await decryptString({ ciphertext: item.encrypted_data, iv: item.iv }, vaultKey);
          setDecrypted(text);
        } else {
          const mime = (item.metadata.mimeType as string) ?? 'application/octet-stream';
          const blob = await decryptToFile({ ciphertext: item.encrypted_data, iv: item.iv }, vaultKey, mime);
          setBlobUrl(URL.createObjectURL(blob));
        }
      } catch {
        setError('Decryption failed. Your vault key may not match.');
      }
    })();
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }

  const meta = catMeta(item.category);
  const Icon = meta.icon;
  const isFile = item.category === 'document' || item.category === 'picture';
  const parsed = decrypted && item.category === 'password' ? JSON.parse(decrypted) : null;

  return (
    <Modal open={true} onClose={onClose} title={item.decryptedTitle} size="md">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className={`size-9 rounded-xl grid place-items-center ${meta.color}`}>
            <Icon size={16} />
          </div>
          <span className="text-sm text-slate-400 capitalize">{item.category.replace('_', ' ')}</span>
        </div>

        {error && <p className="text-sm text-rose-500">{error}</p>}

        {item.category === 'password' && parsed && (
          <div className="space-y-3">
            {parsed.username && (
              <Field label="Username / email" value={parsed.username} onCopy={() => copy(parsed.username)} copied={copied} />
            )}
            {parsed.url && (
              <Field label="URL" value={parsed.url} onCopy={() => copy(parsed.url)} copied={copied} />
            )}
            <Field label="Password" value={parsed.content} masked={!show} onToggle={() => setShow((s) => !s)} onCopy={() => copy(parsed.content)} copied={copied} />
          </div>
        )}

        {(item.category === 'api_key' || item.category === 'note') && decrypted && (
          <div>
            <div className="label mb-1.5">{item.category === 'api_key' ? 'Key' : 'Content'}</div>
            <div className="card p-3 font-mono text-sm break-all flex items-start gap-2">
              <span className="flex-1 break-all">{show ? decrypted : '•'.repeat(Math.min(decrypted.length, 40))}</span>
              <button onClick={() => setShow((s) => !s)} className="text-slate-400 hover:text-accent-500 shrink-0">
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button onClick={() => copy(decrypted)} className="text-slate-400 hover:text-accent-500 shrink-0">
                {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
              </button>
            </div>
          </div>
        )}

        {isFile && blobUrl && (
          <div className="space-y-3">
            {item.category === 'picture' ? (
              <img src={blobUrl} alt={item.decryptedTitle} className="w-full rounded-xl" />
            ) : (
              <div className="card p-6 text-center">
                <FileText size={32} className="text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium">{(item.metadata.fileName as string) ?? item.decryptedTitle}</p>
                <p className="text-xs text-slate-400">{((item.metadata.fileSize as number) / 1024).toFixed(1)} KB</p>
              </div>
            )}
            <a href={blobUrl} download={(item.metadata.fileName as string) ?? item.decryptedTitle} className="btn-outline w-full">
              <Download size={15} /> Download
            </a>
          </div>
        )}

        {isFile && !blobUrl && !error && (
          <div className="text-center py-8 text-sm text-slate-400">Decrypting…</div>
        )}
      </div>
    </Modal>
  );
}

function Field({ label, value, masked, onToggle, onCopy, copied }: {
  label: string;
  value: string;
  masked?: boolean;
  onToggle?: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div>
      <div className="label mb-1.5">{label}</div>
      <div className="card p-3 flex items-center gap-2">
        <span className="flex-1 font-mono text-sm break-all">{masked ? '•'.repeat(Math.min(value.length, 30)) : value}</span>
        {onToggle && (
          <button onClick={onToggle} className="text-slate-400 hover:text-accent-500 shrink-0">
            {masked ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
        )}
        <button onClick={onCopy} className="text-slate-400 hover:text-accent-500 shrink-0">
          {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  );
}
