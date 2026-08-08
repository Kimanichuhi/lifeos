import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, MapPin, Trash2 } from 'lucide-react';
import { createEvent, deleteEvent } from '@/lib/api';
import { useEvents } from '@/lib/hooks';
import { useToast } from '@/lib/toast';
import { Modal } from '@/components/Modal';
import type { CalendarEvent, EventCategory } from '@/lib/types';

type ViewMode = 'day' | 'week' | 'month';

const CATEGORIES: { key: EventCategory; label: string; color: string; dot: string }[] = [
  { key: 'work', label: 'Work', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30', dot: 'bg-blue-500' },
  { key: 'personal', label: 'Personal', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-500' },
  { key: 'church', label: 'Church', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/30', dot: 'bg-violet-500' },
  { key: 'business', label: 'Business', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30', dot: 'bg-amber-500' },
  { key: 'family', label: 'Family', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30', dot: 'bg-rose-500' },
  { key: 'health', label: 'Health', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-500/30', dot: 'bg-cyan-500' },
];

function catMeta(c: string) {
  return CATEGORIES.find((x) => x.key === c) ?? CATEGORIES[1];
}

function startOfWeek(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function Calendar() {
  const { data: events } = useEvents();
  const [mode, setMode] = useState<ViewMode>('week');
  const [cursor, setCursor] = useState(new Date());
  const [showNew, setShowNew] = useState(false);

  const byDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    (events ?? []).forEach((e) => {
      const d = e.start_time.slice(0, 10);
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(e);
    });
    m.forEach((list) => list.sort((a, b) => (a.start_time < b.start_time ? -1 : 1)));
    return m;
  }, [events]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return [...Array(7)].map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
    return [...Array(42)].map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const today = new Date().toISOString().slice(0, 10);

  function shift(amount: number) {
    const d = new Date(cursor);
    if (mode === 'day') d.setDate(d.getDate() + amount);
    else if (mode === 'week') d.setDate(d.getDate() + amount * 7);
    else d.setMonth(d.getMonth() + amount);
    setCursor(d);
  }

  const header = useMemo(() => {
    if (mode === 'day') return cursor.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    if (mode === 'week') {
      const s = weekDays[0], e = weekDays[6];
      return `${s.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    }
    return cursor.toLocaleDateString([], { month: 'long', year: 'numeric' });
  }, [mode, cursor, weekDays]);

  async function remove(id: string) {
    await deleteEvent(id);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="btn-ghost !p-2"><ChevronLeft size={18} /></button>
          <h2 className="font-display font-bold text-xl min-w-[180px] text-center">{header}</h2>
          <button onClick={() => shift(1)} className="btn-ghost !p-2"><ChevronRight size={18} /></button>
          <button onClick={() => { setCursor(new Date()); }} className="btn-outline !py-1.5 text-xs ml-1">Today</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800/60 rounded-xl p-0.5">
            {(['day', 'week', 'month'] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition
                  ${mode === m ? 'bg-white dark:bg-slate-900 shadow-sm text-accent-600 dark:text-accent-300' : 'text-slate-500'}`}
              >
                {m}
              </button>
            ))}
          </div>
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <Plus size={16} /> Event
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {CATEGORIES.map((c) => (
          <span key={c.key} className="chip bg-slate-100 dark:bg-slate-800/60 text-slate-500">
            <span className={`size-2 rounded-full ${c.dot}`} /> {c.label}
          </span>
        ))}
      </div>

      {mode === 'week' && (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((d) => {
            const ds = d.toISOString().slice(0, 10);
            const evs = byDay.get(ds) ?? [];
            const isToday = ds === today;
            return (
              <div key={ds} className={`card p-2 min-h-[160px] ${isToday ? 'ring-2 ring-accent-500/40' : ''}`}>
                <div className="text-center mb-2">
                  <div className="text-[10px] uppercase text-slate-400">{d.toLocaleDateString([], { weekday: 'short' })}</div>
                  <div className={`text-lg font-display font-bold ${isToday ? 'text-accent-500' : ''}`}>{d.getDate()}</div>
                </div>
                <div className="space-y-1">
                  {evs.slice(0, 4).map((e) => {
                    const meta = catMeta(e.category);
                    return (
                      <div key={e.id} className={`text-[11px] rounded-lg px-1.5 py-1 border ${meta.color} group relative`}>
                        <div className="font-medium truncate">{e.title}</div>
                        {!e.all_day && <div className="text-[10px] opacity-70">{fmtTime(e.start_time)}</div>}
                        <button onClick={(ev) => { ev.stopPropagation(); remove(e.id); }} className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-rose-500">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    );
                  })}
                  {evs.length > 4 && <div className="text-[10px] text-slate-400 text-center">+{evs.length - 4} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mode === 'day' && (
        <div className="card p-5">
          <div className="space-y-2">
            {(byDay.get(cursor.toISOString().slice(0, 10)) ?? []).map((e) => {
              const meta = catMeta(e.category);
              return (
                <div key={e.id} className={`flex items-start gap-3 p-3 rounded-xl border ${meta.color} group`}>
                  <div className="text-xs font-mono pt-0.5 w-16 shrink-0">
                    {e.all_day ? 'All day' : fmtTime(e.start_time)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">{e.title}</div>
                    {e.location && <div className="text-xs opacity-70 flex items-center gap-1"><MapPin size={11} /> {e.location}</div>}
                  </div>
                  <button onClick={() => remove(e.id)} className="opacity-0 group-hover:opacity-100 text-rose-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
            {(byDay.get(cursor.toISOString().slice(0, 10)) ?? []).length === 0 && (
              <p className="text-center text-sm text-slate-400 py-10">Nothing scheduled for this day.</p>
            )}
          </div>
        </div>
      )}

      {mode === 'month' && (
        <div className="grid grid-cols-7 gap-1">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="text-[10px] uppercase text-slate-400 text-center py-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}
            </div>
          ))}
          {monthDays.map((d) => {
            const ds = d.toISOString().slice(0, 10);
            const evs = byDay.get(ds) ?? [];
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = ds === today;
            return (
              <button
                key={ds}
                onClick={() => { setMode('day'); setCursor(d); }}
                className={`card p-1.5 min-h-[80px] text-left hover:shadow-glow transition
                  ${!inMonth ? 'opacity-40' : ''} ${isToday ? 'ring-2 ring-accent-500/40' : ''}`}
              >
                <div className={`text-xs font-medium mb-1 ${isToday ? 'text-accent-500' : ''}`}>{d.getDate()}</div>
                <div className="space-y-0.5">
                  {evs.slice(0, 3).map((e) => {
                    const meta = catMeta(e.category);
                    return (
                      <div key={e.id} className="flex items-center gap-1">
                        <span className={`size-1.5 rounded-full ${meta.dot} shrink-0`} />
                        <span className="text-[10px] truncate">{e.title}</span>
                      </div>
                    );
                  })}
                  {evs.length > 3 && <div className="text-[9px] text-slate-400">+{evs.length - 3}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <NewEventModal open={showNew} onClose={() => setShowNew(false)} defaultDate={today} />
    </div>
  );
}

function NewEventModal({ open, onClose, defaultDate }: { open: boolean; onClose: () => void; defaultDate: string }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState<EventCategory>('personal');
  const [location, setLocation] = useState('');
  const [allDay, setAllDay] = useState(false);
  const toast = useToast();

  async function submit() {
    if (!title.trim() || !date) return;
    const start = new Date(`${date}T${allDay ? '00:00' : startTime}`);
    const end = new Date(`${date}T${allDay ? '23:59' : endTime}`);
    const { error } = await createEvent({
      title: title.trim(),
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      category,
      location: location.trim() || null,
      all_day: allDay,
    });
    if (error) { toast.error('Could not create event'); return; }
    toast.success('Event created');
    setTitle(''); setLocation(''); setAllDay(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Event">
      <div className="space-y-4">
        <div>
          <div className="label mb-1.5">Title</div>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's happening?" className="input" />
        </div>
        <div>
          <div className="label mb-1.5">Category</div>
          <div className="grid grid-cols-3 gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`chip justify-center py-2 transition ${category === c.key ? c.color + ' border' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
              >
                <span className={`size-2 rounded-full ${c.dot}`} /> {c.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="label mb-1.5">Date</div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="accent-accent-500" />
          All day
        </label>
        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label mb-1.5">Start</div>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input" />
            </div>
            <div>
              <div className="label mb-1.5">End</div>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input" />
            </div>
          </div>
        )}
        <div>
          <div className="label mb-1.5">Location</div>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" className="input" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={!title.trim()}>Create event</button>
        </div>
      </div>
    </Modal>
  );
}
