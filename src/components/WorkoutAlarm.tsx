import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlarmClock, Play, BellOff, Clock } from 'lucide-react';
import { WorkoutFigure, EXERCISES } from '@/components/WorkoutFigure';
import { showNotification } from '@/lib/notifications';
import { useWorkout, WEEK_PLAN, weekdayIndex, dateKey, planSeconds } from '@/lib/workoutPlan';

const FIRED_KEY = 'lifeos-workout-alarm-fired';
const SNOOZE_KEY = 'lifeos-workout-alarm-snooze';
const SNOOZE_MIN = 10;
/** Ring if the app is opened up to this many minutes after the alarm time. */
const LATE_WINDOW_MIN = 30;
const RING_LIMIT_MS = 90_000;

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* ignore */ }
}

/** Repeating three-beep alarm tone via Web Audio; returns a stop function. */
function startBeeping(): () => void {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return () => {};
  const ctx = new Ctx();
  void ctx.resume().catch(() => {});
  const burst = () => {
    const t0 = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 880;
      const t = t0 + i * 0.22;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    }
    navigator.vibrate?.([200, 100, 200]);
  };
  burst();
  const id = setInterval(burst, 1200);
  return () => { clearInterval(id); void ctx.close().catch(() => {}); };
}

/**
 * App-wide workout alarm. Checks the schedule while Life OS is open, then
 * rings (sound + notification + full-screen card) once per day.
 */
export function WorkoutAlarm({ onStart }: { onStart: () => void }) {
  const alarm = useWorkout((s) => s.alarm);
  const completed = useWorkout((s) => s.completed);
  const ringing = useWorkout((s) => s.ringing);
  const ring = useWorkout((s) => s.ring);
  const stopRinging = useWorkout((s) => s.stopRinging);
  const stopSound = useRef<(() => void) | null>(null);

  const today = WEEK_PLAN[weekdayIndex()];

  // Schedule check.
  useEffect(() => {
    if (!alarm.enabled) return;
    const check = () => {
      if (useWorkout.getState().ringing) return;
      const now = new Date();
      const key = dateKey(now);
      const snooze = Number(read(SNOOZE_KEY) ?? 0);
      if (snooze && Date.now() >= snooze) {
        write(SNOOZE_KEY, null);
        ring();
        return;
      }
      if (snooze || read(FIRED_KEY) === key) return;
      if (!alarm.days.includes(weekdayIndex(now))) return;
      if (useWorkout.getState().completed.includes(key)) return;
      const mins = now.getHours() * 60 + now.getMinutes();
      const target = alarm.hour * 60 + alarm.minute;
      if (mins >= target && mins - target <= LATE_WINDOW_MIN) {
        write(FIRED_KEY, key);
        ring();
      }
    };
    check();
    const id = setInterval(check, 15_000);
    return () => clearInterval(id);
  }, [alarm, ring]);

  // Sound + system notification while ringing.
  useEffect(() => {
    if (!ringing) return;
    const plan = WEEK_PLAN[weekdayIndex()];
    void showNotification(
      'Time to work out 💪',
      `${plan.short}: ${plan.focus} · ${Math.round(planSeconds(plan) / 60)} min`,
      'lifeos-workout',
      'workout',
    ).catch(() => {});
    if (alarm.sound) stopSound.current = startBeeping();
    const timeout = setTimeout(() => { stopSound.current?.(); stopSound.current = null; }, RING_LIMIT_MS);
    return () => {
      clearTimeout(timeout);
      stopSound.current?.();
      stopSound.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringing]);

  function dismiss() {
    write(SNOOZE_KEY, null);
    stopRinging();
  }

  function snooze() {
    write(SNOOZE_KEY, String(Date.now() + SNOOZE_MIN * 60_000));
    stopRinging();
  }

  function start() {
    dismiss();
    onStart();
  }

  const doneToday = completed.includes(dateKey());
  const demo = EXERCISES.find((e) => e.id === today.exercises[0]) ?? EXERCISES[0];

  return (
    <AnimatePresence>
      {ringing && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="alertdialog"
          aria-label="Workout alarm"
        >
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
          <motion.div
            className="relative w-full max-w-sm card p-6 text-center"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            <motion.div
              className="size-14 mx-auto rounded-2xl grid place-items-center bg-accent-500/10 text-accent-500"
              animate={{ rotate: [0, -14, 14, -14, 14, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.6 }}
            >
              <AlarmClock size={28} />
            </motion.div>
            <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-accent-500">
              {String(alarm.hour).padStart(2, '0')}:{String(alarm.minute).padStart(2, '0')} · Workout alarm
            </div>
            <h3 className="font-display font-bold text-2xl mt-1">Time to move!</h3>
            <p className="text-sm text-slate-400 mt-1">
              {today.short} — <span className="font-semibold text-slate-600 dark:text-slate-300">{today.focus}</span> · {Math.round(planSeconds(today) / 60)} min
              {doneToday && ' · already done today'}
            </p>
            <WorkoutFigure exercise={demo} playing className="w-40 h-40 mx-auto" />
            <div className="space-y-2">
              <button className="btn-primary w-full justify-center py-2.5" onClick={start}>
                <Play size={16} /> Start today's workout
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-ghost justify-center" onClick={snooze}>
                  <Clock size={15} /> Snooze {SNOOZE_MIN} min
                </button>
                <button className="btn-ghost justify-center" onClick={dismiss}>
                  <BellOff size={15} /> Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
