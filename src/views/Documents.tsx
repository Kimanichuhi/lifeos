import { motion } from 'framer-motion';
import { FileText, Upload, File, Image, FileCheck, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const DOCS = [
  { name: 'PoaBiz — Business Plan.pdf', type: 'pdf', size: '2.4 MB', date: 'Jul 12, 2026' },
  { name: 'Lease Agreement.pdf', type: 'pdf', size: '890 KB', date: 'Jun 28, 2026' },
  { name: 'Tax Certificate 2025.pdf', type: 'pdf', size: '1.1 MB', date: 'Jun 15, 2026' },
  { name: 'Client Receipt — Acme.png', type: 'image', size: '420 KB', date: 'Jul 3, 2026' },
  { name: 'Meeting Notes — Q3 Strategy.docx', type: 'doc', size: '64 KB', date: 'Jul 8, 2026' },
  { name: 'Book Notes — Atomic Habits.md', type: 'doc', size: '12 KB', date: 'Jul 10, 2026' },
];

const TYPE_META: Record<string, { icon: LucideIcon; color: string }> = {
  pdf: { icon: FileText, color: 'bg-rose-500/10 text-rose-500' },
  image: { icon: Image, color: 'bg-cyan-500/10 text-cyan-500' },
  doc: { icon: File, color: 'bg-blue-500/10 text-blue-500' },
};

export function Documents() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="view-title">Documents</h2>
          <p className="text-sm text-slate-400">Store contracts, receipts, certificates — ask the AI about any of them.</p>
        </div>
        <button className="btn-primary"><Upload size={16} /> Upload</button>
      </div>

      {/* Upload dropzone */}
      <div className="card border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 mb-6 text-center hover:border-accent-500/50 transition cursor-pointer">
        <div className="size-12 rounded-2xl bg-accent-500/10 text-accent-500 grid place-items-center mx-auto mb-3">
          <Upload size={22} />
        </div>
        <p className="font-medium text-sm">Drop files here or click to upload</p>
        <p className="text-xs text-slate-400 mt-1">PDF, Word, images, and text — up to 20 MB each</p>
      </div>

      {/* AI search */}
      <div className="relative mb-5">
        <Sparkles size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-500" />
        <input placeholder="Ask about your documents…" className="input pl-9" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {DOCS.map((d, i) => {
          const meta = TYPE_META[d.type] ?? TYPE_META.doc;
          const Icon = meta.icon;
          return (
            <motion.div
              key={d.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card p-4 group hover:shadow-glow transition cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className={`size-10 rounded-xl grid place-items-center shrink-0 ${meta.color}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{d.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{d.size} · {d.date}</div>
                </div>
                <FileCheck size={15} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
