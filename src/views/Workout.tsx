import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipForward, SkipBack, RotateCcw, Check, Trophy, Timer, AlarmClock, Volume2, VolumeX, BellRing,
} from 'lucide-react';
import { WorkoutFigure, EXERCISES, type Exercise, type ExerciseId } from '@/components/WorkoutFigure';
import { useToast } from '@/lib/toast';
import { requestNotificationPermission } from '@/lib/notifications';
import {
  useWorkout, WEEK_PLAN, weekdayIndex, planSteps, planSeconds, currentWeekKeys, dateKey,
} from '@/lib/workoutPlan';

type Phase = 'idle' | 'work' | 'rest' | 'done';
type Selection = number | 'custom';

const WORK_OPTIONS = [20, 30, 45, 60];
const REST_OPTIONS = [5, 10, 15, 20];
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e])) as Record<ExerciseId, Exercise>;

function clock(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function Workout({ autoStart = false, onAutoStarted }: { autoStart?: boolean; onAutoStarted?: () => void }) {
  const toast = useToast();
  const todayIdx = weekdayIndex();
  const completed = useWorkout((s) => s.completed);
  const markCompleted = useWorkout((s) => s.markCompleted);

  const [selected, setSelected] = useState<Selection>(todayIdx);
  const [enabled, setEnabled] = useState<ExerciseId[]>(EXERCISES.map((e) => e.id));
  const [workSec, setWorkSec] = useState(WEEK_PLAN[todayIdx].workSec);
  const [restSec, setRestSec] = useState(WEEK_PLAN[todayIdx].restSec);
  const [phase, setPhase] = useState<Phase>('idle');
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [reps, setReps] = useState(0);
  const [totalReps, setTotalReps] = useState(0);
  const [preview, setPreview] = useState<ExerciseId>(WEEK_PLAN[todayIdx].exercises[0]);

  const plan = selected === 'custom' ? null : WEEK_PLAN[selected];
  const steps = useMemo<ExerciseId[]>(
    () => (plan ? planSteps(plan) : EXERCISES.filter((e) => enabled.includes(e.id)).map((e) => e.id)),
    [plan, enabled],
  );
  const listed = plan ? plan.exercises : EXERCISES.map((e) => e.id);
  const current = steps[index] ? BY_ID[steps[index]] : undefined;
  const next = steps[index + 1] ? BY_ID[steps[index + 1]] : undefined;
  const totalSec = steps.length * workSec + Math.max(0, steps.length - 1) * restSec;
  const roundSize = plan ? plan.exercises.length : steps.length;

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
      if (index + 1 >= steps.length) finish();
      else { setPhase('rest'); setRemaining(restSec); }
    } else if (phase === 'rest') {
      goTo(index + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, running, phase]);

  // Opened from the alarm: jump straight into today's plan.
  useEffect(() => {
    if (autoStart) { start(); onAutoStarted?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(sel: Selection) {
    setSelected(sel);
    if (sel !== 'custom') {
      setWorkSec(WEEK_PLAN[sel].workSec);
      setRestSec(WEEK_PLAN[sel].restSec);
      setPreview(WEEK_PLAN[sel].exercises[0]);
    }
  }

  function goTo(i: number) {
    setIndex(i);
    setPhase('work');
    setRemaining(workSec);
    setReps(0);
  }

  function start() {
    if (steps.length === 0) { toast.error('Pick at least one exercise'); return; }
    setTotalReps(0);
    goTo(0);
    setRunning(true);
  }

  function finish() {
    setRunning(false);
    setPhase('done');
    markCompleted();
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
    if (i >= steps.length) { finish(); return; }
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
  const shown = phase === 'rest' && next ? next : active && current ? current : BY_ID[preview];
  const phaseLength = phase === 'rest' ? restSec : workSec;
  const ringPct = active ? remaining / phaseLength : 1;
  const R = 54;
  const C = 2 * Math.PI * R;
  const weekKeys = currentWeekKeys();
  const doneThisWeek = weekKeys.filter((k) => completed.includes(k)).length;
  const round = Math.floor(index / roundSize) + 1;
  const rounds = Math.ceil(steps.length / roundSize);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="view-title">Workout</h2>
          <p className="text-sm text-slate-400">A guided bodyweight plan for every day of the week.</p>
        </div>
        <div className="chip bg-slate-100 dark:bg-slate-800 text-slate-500">
          <Timer size={13} /> {clock(totalSec)}
        </div>
      </div>

      {/* Week plan */}
      <div className="card p-4 mb-4 flex gap-4">
        <img
          src="/workout/coach.webp"
          alt="Your coach"
          width={640}
          height={960}
          className="hidden md:block w-28 self-stretch object-cover object-top rounded-xl bg-slate-100 dark:bg-slate-800"
        />
        <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-bold">This week</h3>
            <p className="text-xs text-slate-400">20 minutes a day · follow your coach</p>
          </div>
          <span className="text-xs text-slate-400">{doneThisWeek} / 7 done</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {WEEK_PLAN.map((d) => {
            const done = completed.includes(weekKeys[d.day]);
            const isSel = selected === d.day;
            const isToday = d.day === todayIdx;
            return (
              <button
                key={d.day}
                disabled={phase !== 'idle'}
                onClick={() => choose(d.day)}
                className={`relative text-left rounded-xl p-2.5 border transition disabled:opacity-60 ${isSel ? 'border-accent-500 bg-accent-500/10' : 'border-slate-200 dark:border-slate-800 hover:border-accent-300'}`}
              >
                <div className={`text-xs font-semibold ${isToday ? 'text-accent-500' : 'text-slate-400'}`}>
                  {d.short}{isToday && ' · today'}
                </div>
                <div className="text-sm font-semibold leading-tight mt-0.5 line-clamp-2">{d.focus}</div>
                <div className="text-[11px] text-slate-400 mt-1">{Math.round(planSeconds(d) / 60)} min</div>
                {done && (
                  <span className="absolute top-2 right-2 size-4 rounded-full bg-emerald-500 text-white grid place-items-center">
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
          <button
            disabled={phase !== 'idle'}
            onClick={() => choose('custom')}
            className={`text-left rounded-xl p-2.5 border border-dashed transition disabled:opacity-60 ${selected === 'custom' ? 'border-accent-500 bg-accent-500/10' : 'border-slate-300 dark:border-slate-700 hover:border-accent-300'}`}
          >
            <div className="text-xs font-semibold text-slate-400">Any day</div>
            <div className="text-sm font-semibold leading-tight mt-0.5">Custom</div>
            <div className="text-[11px] text-slate-400 mt-1">Pick exercises</div>
          </button>
        </div>
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
                <p className="text-sm text-slate-400 mb-1">
                  {steps.length} sets · {clock(totalSec)} · {totalReps} reps
                </p>
                <p className="text-sm text-emerald-500 mb-6">{doneThisWeek} of 7 days done this week</p>
                <div className="flex gap-2 justify-center">
                  <button className="btn-ghost" onClick={reset}>Back</button>
                  <button className="btn-primary" onClick={start}><RotateCcw size={15} /> Go again</button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col items-center">
                <div className="text-xs font-semibold uppercase tracking-wider mb-1 h-4">
                  {phase === 'work' && (
                    <span className="text-accent-500">
                      {rounds > 1 && `Round ${round} of ${rounds} · `}Set {index + 1} of {steps.length}
                    </span>
                  )}
                  {phase === 'rest' && <span className="text-emerald-500">Rest · up next</span>}
                  {phase === 'idle' && <span className="text-slate-400">{plan ? `${plan.short} · ${plan.focus}` : 'Custom workout'}</span>}
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
                    <button className="btn-primary px-6" onClick={start} disabled={steps.length === 0}>
                      <Play size={16} /> Start {plan ? `${plan.short}'s` : ''} workout
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
                    {steps.map((id, i) => (
                      <div key={i} className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden" title={BY_ID[id].name}>
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold">{plan ? plan.focus : 'Routine'}</h3>
              {plan && <span className="text-xs text-slate-400">{plan.rounds} round{plan.rounds > 1 ? 's' : ''}</span>}
            </div>
            <div className="space-y-1">
              {listed.map((id, i) => {
                const e = BY_ID[id];
                const on = plan ? true : enabled.includes(id);
                const isCurrent = active && (plan ? index % roundSize === i : current?.id === id);
                return (
                  <div
                    key={`${id}-${i}`}
                    className={`flex items-center gap-3 p-2 rounded-lg transition ${isCurrent ? 'bg-accent-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                  >
                    {plan ? (
                      <span className="size-5 rounded-md grid place-items-center text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">{i + 1}</span>
                    ) : (
                      <button
                        onClick={() => toggle(id)}
                        disabled={phase !== 'idle'}
                        aria-label={on ? `Remove ${e.name}` : `Add ${e.name}`}
                        className={`size-5 rounded-md grid place-items-center border transition shrink-0 disabled:opacity-60 ${on ? 'bg-accent-500 border-accent-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}
                      >
                        {on && <Check size={13} strokeWidth={3} />}
                      </button>
                    )}
                    <button
                      onClick={() => phase === 'idle' && setPreview(id)}
                      className={`flex-1 text-left text-sm ${on ? '' : 'text-slate-400 line-through'} ${phase === 'idle' && preview === id ? 'text-accent-500 font-semibold' : ''}`}
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
                {[...new Set([...WORK_OPTIONS, workSec])].sort((a, b) => a - b).map((s) => (
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
                {[...new Set([...REST_OPTIONS, restSec])].sort((a, b) => a - b).map((s) => (
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

          <AlarmCard />
        </div>
      </div>
    </div>
  );
}

function AlarmCard() {
  const toast = useToast();
  const alarm = useWorkout((s) => s.alarm);
  const setAlarm = useWorkout((s) => s.setAlarm);
  const ring = useWorkout((s) => s.ring);
  const completed = useWorkout((s) => s.completed);
  const time = `${String(alarm.hour).padStart(2, '0')}:${String(alarm.minute).padStart(2, '0')}`;
  const everyDay = alarm.days.length === 7;

  async function toggleEnabled() {
    const enabled = !alarm.enabled;
    setAlarm({ enabled });
    if (enabled) {
      const perm = await requestNotificationPermission().catch(() => 'denied' as NotificationPermission);
      toast.success(`Workout alarm set for ${time}${everyDay ? ' every day' : ''}`);
      if (perm !== 'granted') toast.error('Notifications are blocked — the alarm will only ring inside the open app');
    }
  }

  function toggleDay(d: number) {
    const days = alarm.days.includes(d) ? alarm.days.filter((x) => x !== d) : [...alarm.days, d].sort();
    setAlarm({ days });
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlarmClock size={18} className="text-accent-500" />
        <h3 className="font-display font-bold flex-1">Daily alarm</h3>
        <button
          role="switch"
          aria-checked={alarm.enabled}
          aria-label="Workout alarm"
          onClick={toggleEnabled}
          className={`relative w-10 h-6 rounded-full transition ${alarm.enabled ? 'bg-accent-500' : 'bg-slate-200 dark:bg-slate-700'}`}
        >
          <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${alarm.enabled ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
      </div>

      <div className={`space-y-3 transition ${alarm.enabled ? '' : 'opacity-50'}`}>
        <input
          type="time"
          value={time}
          onChange={(e) => {
            const [h, m] = e.target.value.split(':').map(Number);
            if (!Number.isNaN(h) && !Number.isNaN(m)) setAlarm({ hour: h, minute: m });
          }}
          className="input font-display font-bold text-2xl text-center tabular-nums"
        />
        <div className="flex gap-1">
          {DAY_LETTERS.map((l, d) => (
            <button
              key={d}
              onClick={() => toggleDay(d)}
              aria-label={WEEK_PLAN[d].short}
              aria-pressed={alarm.days.includes(d)}
              className={`flex-1 h-8 rounded-lg text-xs font-semibold transition ${alarm.days.includes(d) ? 'bg-accent-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAlarm({ sound: !alarm.sound })}
            className="chip bg-slate-100 dark:bg-slate-800 text-slate-500 py-1.5"
          >
            {alarm.sound ? <Volume2 size={13} /> : <VolumeX size={13} />} Sound {alarm.sound ? 'on' : 'off'}
          </button>
          <button onClick={ring} className="chip bg-slate-100 dark:bg-slate-800 text-slate-500 py-1.5 ml-auto">
            <BellRing size={13} /> Test
          </button>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Rings while Life OS is open (keep the installed app or a tab running). It skips days you've already
          {completed.includes(dateKey()) ? ' — today is done ✓' : ' worked out.'}
        </p>
      </div>
    </div>
  );
}
