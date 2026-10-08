import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Check, Trophy, Timer } from 'lucide-react';
import { WorkoutFigure, EXERCISES, type ExerciseId } from '@/components/WorkoutFigure';
import { useToast } from '@/lib/toast';

type Phase = 'idle' | 'work' | 'rest' | 'done';

const WORK_OPTIONS = [20, 30, 45, 60];
const REST_OPTIONS = [5, 10, 15, 20];

function clock(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function Workout() {
  const toast = useToast();
  const [enabled, setEnabled] = useState<ExerciseId[]>(EXERCISES.map((e) => e.id));
  const [workSec, setWorkSec] = useState(30);
  const [restSec, setRestSec] = useState(10);
  const [phase, setPhase] = useState<Phase>('idle');
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [reps, setReps] = useState(0);
  const [totalReps, setTotalReps] = useState(0);
  const [preview, setPreview] = useState<ExerciseId>(EXERCISES[0].id);

  const routine = useMemo(() => EXERCISES.filter((e) => enabled.includes(e.id)), [enabled]);
  const current = routine[index];
  const next = routine[index + 1];
  const totalSec = routine.length * workSec + Math.max(0, routine.length - 1) * restSec;

  // Countdown — one tick per second while a phase is running.
  useEffect(() => {
    if (!running || (phase !== 'work' && phase !== 'rest')) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [running, phase]);

  // Advance when the countdown reaches zero.
  useEffect(() => {
    if (remaining > 0 || !running) return;
    if (phase === 'work') {
      if (index + 1 >= routine.length) finish();
      else { setPhase('rest'); setRemaining(restSec); }
    } else if (phase === 'rest') {
      goTo(index + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, running, phase]);

  function goTo(i: number) {
    setIndex(i);
    setPhase('work');
    setRemaining(workSec);
    setReps(0);
  }

  function start() {
    if (routine.length === 0) { toast.error('Pick at least one exercise'); return; }
    setTotalReps(0);
    goTo(0);
    setRunning(true);
  }

  function finish() {
    setRunning(false);
    setPhase('done');
    toast.success('Workout complete — nice work!');
  }

  function reset() {
    setRunning(false);
    setPhase('idle');
    setIndex(0);
    setReps(0);
  }

  function skip(dir: 1 | -1) {
    const i = index + dir;
    if (i < 0) return;
    if (i >= routine.length) { finish(); return; }
    goTo(i);
  }

  function countRep() {
    setReps((r) => r + 1);
    setTotalReps((r) => r + 1);
  }

  function toggle(id: ExerciseId) {
    setEnabled((list) => (list.includes(id) ? list.filter((x) => x !== id) : EXERCISES.filter((e) => e.id === id || list.includes(e.id)).map((e) => e.id)));
  }

  const active = phase === 'work' || phase === 'rest';
  const shown = phase === 'rest' && next ? next : active && current ? current : EXERCISES.find((e) => e.id === preview)!;
  const phaseLength = phase === 'rest' ? restSec : workSec;
  const ringPct = active ? remaining / phaseLength : 1;
  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="view-title">Workout</h2>
          <p className="text-sm text-slate-400">A quick guided bodyweight routine — follow the figure.</p>
        </div>
        <div className="chip bg-slate-100 dark:bg-slate-800 text-slate-500">
          <Timer size={13} /> {clock(totalSec)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="card p-5 sm:p-6 flex flex-col items-center">
          <AnimatePresence mode="wait">
            {phase === 'done' ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-10 text-center">
                <div className="size-16 mx-auto mb-4 rounded-2xl grid place-items-center bg-accent-500/10 text-accent-500">
                  <Trophy size={30} />
                </div>
                <h3 className="font-display font-bold text-2xl mb-1">Workout complete</h3>
                <p className="text-sm text-slate-400 mb-6">
                  {routine.length} exercises · {clock(totalSec)} · {totalReps} reps
                </p>
                <div className="flex gap-2 justify-center">
                  <button className="btn-ghost" onClick={reset}>Back</button>
                  <button className="btn-primary" onClick={start}><RotateCcw size={15} /> Go again</button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col items-center">
                <div className="text-xs font-semibold uppercase tracking-wider mb-1 h-4">
                  {phase === 'work' && <span className="text-accent-500">Exercise {index + 1} of {routine.length}</span>}
                  {phase === 'rest' && <span className="text-emerald-500">Rest · up next</span>}
                  {phase === 'idle' && <span className="text-slate-400">Preview</span>}
                </div>
                <h3 className="font-display font-bold text-2xl text-center">{shown.name}</h3>
                <p className="text-sm text-slate-400 text-center mb-2">{shown.cue}</p>

                <div className="relative w-full max-w-[340px] aspect-square">
                  <WorkoutFigure
                    exercise={shown}
                    playing={phase === 'idle' || (phase === 'work' && running)}
                    onRep={phase === 'work' ? countRep : undefined}
                    className={`w-full h-full transition-opacity ${phase === 'rest' ? 'opacity-40' : ''}`}
                  />
                  {phase === 'rest' && (
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="font-display font-bold text-6xl text-emerald-500 tabular-nums">{remaining}</div>
                    </div>
                  )}
                </div>

                {active && (
                  <div className="flex items-center gap-6 mt-2">
                    <div className="relative size-[128px]">
                      <svg viewBox="0 0 128 128" className="size-full -rotate-90">
                        <circle cx="64" cy="64" r={R} fill="none" strokeWidth="8" className="stroke-slate-100 dark:stroke-slate-800" />
                        <circle
                          cx="64" cy="64" r={R} fill="none" strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={C} strokeDashoffset={C * (1 - ringPct)}
                          style={{ stroke: phase === 'rest' ? 'rgb(16 185 129)' : 'rgb(var(--accent-500))', transition: 'stroke-dashoffset 1s linear' }}
                        />
                      </svg>
                      <div className="absolute inset-0 grid place-items-center">
                        <div className="text-center">
                          <div className="font-display font-bold text-3xl tabular-nums">{clock(remaining)}</div>
                          <div className="text-[11px] text-slate-400">{phase === 'rest' ? 'rest' : 'remaining'}</div>
                        </div>
                      </div>
                    </div>
                    {phase === 'work' && (
                      <div className="text-center">
                        <div className="font-display font-bold text-4xl tabular-nums">{current?.hold ? '—' : reps}</div>
                        <div className="text-[11px] text-slate-400">{current?.hold ? 'hold' : 'reps'}</div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-6">
                  {phase === 'idle' ? (
                    <button className="btn-primary px-6" onClick={start} disabled={routine.length === 0}>
                      <Play size={16} /> Start workout
                    </button>
                  ) : (
                    <>
                      <button className="btn-ghost" onClick={reset} title="End workout"><RotateCcw size={16} /></button>
                      <button className="btn-ghost" onClick={() => skip(-1)} disabled={index === 0} title="Previous"><SkipBack size={16} /></button>
                      <button className="btn-primary px-6" onClick={() => setRunning((r) => !r)}>
                        {running ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Resume</>}
                      </button>
                      <button className="btn-ghost" onClick={() => skip(1)} title="Next"><SkipForward size={16} /></button>
                    </>
                  )}
                </div>

                {active && (
                  <div className="w-full flex gap-1 mt-6">
                    {routine.map((e, i) => (
                      <div key={e.id} className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent-500 transition-all duration-1000 ease-linear"
                          style={{ width: i < index ? '100%' : i === index && phase === 'work' ? `${(1 - remaining / workSec) * 100}%` : i === index ? '100%' : '0%' }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-display font-bold mb-3">Routine</h3>
            <div className="space-y-1">
              {EXERCISES.map((e) => {
                const on = enabled.includes(e.id);
                const isCurrent = active && current?.id === e.id;
                return (
                  <div
                    key={e.id}
                    className={`flex items-center gap-3 p-2 rounded-lg transition ${isCurrent ? 'bg-accent-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                  >
                    <button
                      onClick={() => toggle(e.id)}
                      disabled={phase !== 'idle'}
                      aria-label={on ? `Remove ${e.name}` : `Add ${e.name}`}
                      className={`size-5 rounded-md grid place-items-center border transition shrink-0 disabled:opacity-60 ${on ? 'bg-accent-500 border-accent-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}
                    >
                      {on && <Check size={13} strokeWidth={3} />}
                    </button>
                    <button
                      onClick={() => phase === 'idle' && setPreview(e.id)}
                      className={`flex-1 text-left text-sm ${on ? '' : 'text-slate-400 line-through'} ${phase === 'idle' && preview === e.id ? 'text-accent-500 font-semibold' : ''}`}
                    >
                      {e.name}
                    </button>
                    <WorkoutFigure exercise={e} playing={false} className="size-8 shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <div>
              <div className="label mb-2">Work per exercise</div>
              <div className="flex gap-1.5">
                {WORK_OPTIONS.map((s) => (
                  <button
                    key={s}
                    disabled={phase !== 'idle'}
                    onClick={() => setWorkSec(s)}
                    className={`chip flex-1 justify-center py-1.5 transition disabled:opacity-60 ${workSec === s ? 'bg-accent-500/10 text-accent-500 border border-accent-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="label mb-2">Rest between</div>
              <div className="flex gap-1.5">
                {REST_OPTIONS.map((s) => (
                  <button
                    key={s}
                    disabled={phase !== 'idle'}
                    onClick={() => setRestSec(s)}
                    className={`chip flex-1 justify-center py-1.5 transition disabled:opacity-60 ${restSec === s ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
