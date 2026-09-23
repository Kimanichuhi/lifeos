import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Upload, File, Image, Trash2, Search, Download, Share2, Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createDocument, deleteDocument } from '@/lib/api';
import { useDocuments } from '@/lib/hooks';
import { useToast } from '@/lib/toast';
import { Modal } from '@/components/Modal';
import {
  deleteDocumentFile, downloadDocumentFile, getDocumentSignedUrl, newDocumentPath, uploadDocumentFile,
} from '@/lib/documentStorage';
import type { DocumentFile } from '@/lib/types';

const MAX_SIZE = 20 * 1024 * 1024;

type Kind = 'image' | 'pdf' | 'text' | 'other';

function fileKind(mimeType: string, fileName: string): Kind {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('text/') || /\.(md|txt|csv|json|log|yml|yaml)$/i.test(fileName)) return 'text';
  return 'other';
}

const TYPE_META: Record<Kind, { icon: LucideIcon; color: string }> = {
  pdf: { icon: FileText, color: 'bg-rose-500/10 text-rose-500' },
  image: { icon: Image, color: 'bg-cyan-500/10 text-cyan-500' },
  text: { icon: File, color: 'bg-blue-500/10 text-blue-500' },
  other: { icon: File, color: 'bg-slate-500/10 text-slate-500' },
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function Documents() {
  const { data: documents, loading } = useDocuments();
  const [query, setQuery] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState<DocumentFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const docs = useMemo(() => documents ?? [], [documents]);
  const filtered = useMemo(
    () => docs.filter((d) => d.file_name.toLowerCase().includes(query.trim().toLowerCase())),
    [docs, query],
  );

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    let ok = 0;
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_SIZE) { toast.error(`${file.name} is over the 20 MB limit`); continue; }
      const path = newDocumentPath(file.name);
      const { error: upErr } = await uploadDocumentFile(path, file);
      if (upErr) { toast.error(`Could not upload ${file.name}`); continue; }
      const { error: rowErr } = await createDocument({
        file_name: file.name,
        storage_path: path,
        mime_type: file.type || 'application/octet-stream',
        file_size: file.size,
      });
      if (rowErr) { toast.error(`Uploaded but could not save ${file.name}`); continue; }
      ok++;
    }
    setUploading(false);
    if (ok > 0) toast.success(ok === 1 ? 'Document uploaded' : `${ok} documents uploaded`);
  }

  async function remove(doc: DocumentFile) {
    await deleteDocumentFile(doc.storage_path);
    await deleteDocument(doc.id);
    toast.success('Document deleted');
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="view-title">Documents</h2>
          <p className="text-sm text-slate-400">Store contracts, receipts, certificates — preview, export, or share any of them.</p>
        </div>
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-primary">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Upload
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
      />

      {/* Upload dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        className={`card border-2 border-dashed p-8 mb-6 text-center transition cursor-pointer ${dragOver ? 'border-accent-500 bg-accent-500/5' : 'border-slate-200 dark:border-slate-800 hover:border-accent-500/50'}`}
      >
        <div className="size-12 rounded-2xl bg-accent-500/10 text-accent-500 grid place-items-center mx-auto mb-3">
          {uploading ? <Loader2 size={22} className="animate-spin" /> : <Upload size={22} />}
        </div>
        <p className="font-medium text-sm">{uploading ? 'Uploading…' : 'Drop files here or click to upload'}</p>
        <p className="text-xs text-slate-400 mt-1">PDF, Word, images, and text — up to 20 MB each</p>
      </div>

      {/* Filename filter */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter documents by name…" className="input pl-9" />
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-20 rounded-2xl shimmer-bg animate-shimmer" />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <FileText size={40} className="text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">{docs.length === 0 ? 'No documents yet. Upload your first one.' : 'No documents match your filter.'}</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {filtered.map((d, i) => {
              const kind = fileKind(d.mime_type, d.file_name);
              const meta = TYPE_META[kind];
              const Icon = meta.icon;
              return (
                <motion.button
                  key={d.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => setPreviewing(d)}
                  className="card p-4 text-left group hover:shadow-glow transition"
                >
                  <div className="flex items-start gap-3">
                    <div className={`size-10 rounded-xl grid place-items-center shrink-0 ${meta.color}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{d.file_name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {formatSize(d.file_size)} · {new Date(d.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); remove(d); }}
                      className="text-slate-300 hover:text-rose-500 transition opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {previewing && <DocumentPreviewModal doc={previewing} onClose={() => setPreviewing(null)} />}
    </div>
  );
}

function DocumentPreviewModal({ doc, onClose }: { doc: DocumentFile; onClose: () => void }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const toast = useToast();
  const kind = fileKind(doc.mime_type, doc.file_name);
  const meta = TYPE_META[kind];
  const Icon = meta.icon;

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    (async () => {
      const { data, error: dlErr } = await downloadDocumentFile(doc.storage_path);
      if (cancelled) return;
      if (dlErr || !data) { setError('Could not load this file.'); return; }
      setBlob(data);
      if (kind === 'image' || kind === 'pdf') {
        objectUrl = URL.createObjectURL(data);
        setPreviewUrl(objectUrl);
      } else if (kind === 'text') {
        setTextContent(await data.text());
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  function download() {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.file_name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function shareToWhatsApp() {
    setSharing(true);
    const { data, error: signErr } = await getDocumentSignedUrl(doc.storage_path, 3600);
    setSharing(false);
    if (signErr || !data) { toast.error('Could not create a share link'); return; }
    const text = `${doc.file_name}\n${data.signedUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <Modal open={true} onClose={onClose} title={doc.file_name} size="lg">
      <div className="space-y-4">
        <div className="text-xs text-slate-400">
          {formatSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>

        {error && <p className="text-sm text-rose-500">{error}</p>}

        {!error && !blob && (
          <div className="text-center py-16 text-sm text-slate-400">Loading preview…</div>
        )}

        {!error && blob && kind === 'image' && previewUrl && (
          <img src={previewUrl} alt={doc.file_name} className="w-full max-h-[60vh] object-contain rounded-xl bg-slate-50 dark:bg-slate-900" />
        )}
        {!error && blob && kind === 'pdf' && previewUrl && (
          <iframe src={previewUrl} title={doc.file_name} className="w-full h-[65vh] rounded-xl border border-slate-200 dark:border-slate-800" />
        )}
        {!error && blob && kind === 'text' && textContent !== null && (
          <pre className="text-xs whitespace-pre-wrap break-words card p-4 max-h-[60vh] overflow-y-auto font-mono">{textContent}</pre>
        )}
        {!error && blob && kind === 'other' && (
          <div className="card p-10 text-center">
            <div className={`size-14 rounded-2xl grid place-items-center mx-auto mb-3 ${meta.color}`}>
              <Icon size={26} />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">No inline preview for this file type. Download to view.</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
          <p className="text-[11px] text-slate-400">WhatsApp link expires in 1 hour.</p>
          <div className="flex gap-2">
            <button onClick={shareToWhatsApp} disabled={sharing} className="btn-outline !py-1.5 !text-xs">
              <Share2 size={13} /> {sharing ? 'Preparing…' : 'Share to WhatsApp'}
            </button>
            <button onClick={download} disabled={!blob} className="btn-primary !py-1.5 !text-xs">
              <Download size={13} /> Export
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
