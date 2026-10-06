import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Pin, Trash2, Tag, FileText } from 'lucide-react';
import { createNote, deleteNote, updateNote } from '@/lib/api';
import { useNotes } from '@/lib/hooks';
import { useToast } from '@/lib/toast';
import { Modal } from '@/components/Modal';
import type { Note } from '@/lib/types';

export function Notes() {
  const { data: notes, loading } = useNotes();
  const [query, setQuery] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  const filtered = useMemo(() => {
    if (!notes) return [];
    const list = query.trim()
      ? notes.filter((n) =>
          n.title.toLowerCase().includes(query.toLowerCase()) ||
          (n.content ?? '').toLowerCase().includes(query.toLowerCase()) ||
          n.tags.some((t) => t.toLowerCase().includes(query.toLowerCase())))
      : notes;
    return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.updated_at < a.updated_at ? -1 : 1));
  }, [notes, query]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="min-w-0">
          <h2 className="view-title">Notes</h2>
          <p className="text-sm text-slate-400">Your second brain — ideas, research, anything.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary shrink-0">
          <Plus size={16} /> New note
        </button>
      </div>

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes…" className="input pl-9" />
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 rounded-2xl shimmer-bg animate-shimmer" />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <FileText size={40} className="text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400">{query ? 'No notes match your search.' : 'No notes yet. Capture your first idea.'}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((n) => (
            <motion.button
              key={n.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={() => setEditing(n)}
              className="card p-4 text-left group hover:shadow-glow transition relative"
            >
              {n.pinned && <Pin size={13} className="absolute top-3 right-3 text-accent-500 fill-accent-500" />}
              <h3 className="font-display font-bold text-sm mb-1.5 pr-5 truncate">{n.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-4 whitespace-pre-line mb-3 min-h-[3rem]">
                {n.content || 'Empty note'}
              </p>
              {n.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {n.tags.slice(0, 3).map((t) => (
                    <span key={t} className="chip bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px]">
                      <Tag size={9} /> {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-[10px] text-slate-400 mt-2">
                {new Date(n.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <NewNoteModal open={showNew} onClose={() => setShowNew(false)} onCreated={(n) => setEditing(n)} />
      {editing && <EditNoteModal note={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function NewNoteModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (n: Note) => void }) {
  const [title, setTitle] = useState('');
  const toast = useToast();

  async function submit() {
    if (!title.trim()) return;
    const { data, error } = await createNote({ title: title.trim(), content: '', tags: [], pinned: false });
    if (error || !data) { toast.error('Could not create note'); return; }
    toast.success('Note created');
    setTitle('');
    onClose();
    onCreated(data as Note);
  }

  return (
    <Modal open={open} onClose={onClose} title="New Note" size="sm">
      <div className="space-y-4">
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Note title" className="input" />
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={!title.trim()}>Create</button>
        </div>
      </div>
    </Modal>
  );
}

function EditNoteModal({ note, onClose }: { note: Note; onClose: () => void }) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content ?? '');
  const [tags, setTags] = useState(note.tags.join(', '));
  const [pinned, setPinned] = useState(note.pinned);
  const toast = useToast();

  async function save() {
    const { error } = await updateNote(note.id, {
      title: title.trim() || 'Untitled',
      content,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      pinned,
    });
    if (error) { toast.error('Could not save'); return; }
    toast.success('Note saved');
    onClose();
  }

  async function remove() {
    await deleteNote(note.id);
    toast.success('Note deleted');
    onClose();
  }

  return (
    <Modal open={true} onClose={onClose} title="Edit Note">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="input font-display font-bold" />
          <button onClick={() => setPinned(!pinned)} className={`btn-ghost !p-2.5 ${pinned ? 'text-accent-500' : ''}`} title="Pin">
            <Pin size={16} className={pinned ? 'fill-accent-500' : ''} />
          </button>
        </div>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10} placeholder="Start writing…" className="input resize-y font-mono text-sm leading-relaxed" />
        <div>
          <div className="label mb-1.5">Tags (comma separated)</div>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="idea, research, books" className="input" />
        </div>
        <div className="flex justify-between gap-2 pt-2">
          <button className="btn-ghost text-rose-500 hover:bg-rose-500/10" onClick={remove}>
            <Trash2 size={15} /> Delete
          </button>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={onClose}>Close</button>
            <button className="btn-primary" onClick={save}>Save</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
