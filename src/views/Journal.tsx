import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, Save, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getJournalByDate, upsertJournal } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { JournalEntry } from '@/lib/types';

function todayStr() { return new Date().toISOString().slice(0, 10); }

const MOODS = ['Awful', 'Low', 'Okay', 'Good', 'Great'];

export function Journal() {
  const [date, setDate] = useState(todayStr());
  const [entry, setEntry] = useState<Partial<JournalEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await getJournalByDate(date);
      setEntry(data);
      setLoading(false);
    })();
  }, [date]);

  function shift(days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
  }

  async function save() {
    if (!entry) return;
    setSaving(true);
    const { error } = await upsertJournal({ ...entry, entry_date: date } as JournalEntry & { entry_date: string });
    setSaving(false);
    if (error) toast.error('Could not save entry');
    else toast.success('Entry saved');
  }

  function update(field: keyof JournalEntry, value: unknown) {
    setEntry((e) => ({ ...e, [field]: value }));
  }

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString([], {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="btn-ghost !p-2"><ChevronLeft size={18} /></button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input !w-auto !py-1.5"
          />
          <button onClick={() => shift(1)} className="btn-ghost !p-2"><ChevronRight size={18} /></button>
          {date === todayStr() && <span className="chip bg-accent-500/15 text-accent-600 dark:text-accent-300">Today</span>}
        </div>
        <button onClick={save} disabled={saving || loading} className="btn-primary">
          <Save size={15} /> {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <h2 className="view-title mb-1">{displayDate}</h2>
      <p className="text-sm text-slate-400 mb-6">Capture your morning intentions and evening reflections.</p>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl shimmer-bg animate-shimmer" />)}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Morning section */}
          <Section title="Morning" icon={Sparkles}>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Metric label="Mood" value={entry?.mood ?? null} onChange={(v) => update('mood', v)} options={MOODS} />
              <Metric label="Energy" value={entry?.energy ?? null} onChange={(v) => update('energy', v)} options={MOODS} />
              <Metric label="Focus" value={entry?.focus ?? null} onChange={(v) => update('focus', v)} options={MOODS} />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Sleep (hours)" type="number" value={entry?.sleep_hours ?? ''} onChange={(v) => update('sleep_hours', v ? Number(v) : null)} />
            </div>
            <TextArea label="Gratitude" value={entry?.gratitude ?? ''} onChange={(v) => update('gratitude', v)} placeholder="What are you grateful for today?" />
            <TextArea label="Prayer" value={entry?.prayer ?? ''} onChange={(v) => update('prayer', v)} placeholder="Morning prayer or intention…" />
            <TextArea label="Today's goals" value={entry?.morning_goals ?? ''} onChange={(v) => update('morning_goals', v)} placeholder="What do you want to accomplish?" />
          </Section>

          {/* Evening section */}
          <Section title="Evening Reflection" icon={Star}>
            <div className="grid grid-cols-1 gap-3 mb-4">
              <div>
                <div className="label mb-1.5">Evening mood</div>
                <div className="flex gap-2">
                  {MOODS.map((m, i) => (
                    <button
                      key={m}
                      onClick={() => update('evening_mood', i + 1)}
                      className={`chip transition ${entry?.evening_mood === i + 1 ? 'bg-accent-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                    >
                      {i + 1} · {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <TextArea label="What went well?" value={entry?.wins ?? ''} onChange={(v) => update('wins', v)} placeholder="Your wins today…" />
            <TextArea label="Challenges" value={entry?.challenges ?? ''} onChange={(v) => update('challenges', v)} placeholder="What was difficult?" />
            <TextArea label="Lessons learned" value={entry?.lessons ?? ''} onChange={(v) => update('lessons', v)} placeholder="What did you learn?" />
            <TextArea label="Tomorrow's priorities" value={entry?.tomorrow_priorities ?? ''} onChange={(v) => update('tomorrow_priorities', v)} placeholder="What matters most tomorrow?" />
          </Section>

          {entry?.ai_summary && (
            <div className="card p-5 bg-accent-500/5 border-accent-500/20">
              <div className="flex items-center gap-2 mb-2 text-accent-600 dark:text-accent-300">
                <Sparkles size={16} />
                <span className="font-semibold text-sm">AI Summary</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">{entry.ai_summary}</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className="text-accent-500" />
        <h3 className="font-display font-semibold">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Metric({ label, value, onChange, options }: { label: string; value: number | null; onChange: (v: number) => void; options: string[] }) {
  return (
    <div>
      <div className="label mb-1.5">{label}</div>
      <div className="flex gap-1">
        {options.map((m, i) => (
          <button
            key={m}
            onClick={() => onChange(i + 1)}
            title={m}
            className={`flex-1 h-9 rounded-lg text-xs font-medium transition
              ${value === i + 1 ? 'bg-accent-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange }: { label: string; type?: string; value: string | number; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="label mb-1.5">{label}</div>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="input" />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <div className="label mb-1.5">{label}</div>
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="input resize-y min-h-[80px]"
      />
    </div>
  );
}
