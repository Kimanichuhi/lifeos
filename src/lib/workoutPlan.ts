import { create } from './tinyStore';
import type { ExerciseId } from '@/components/WorkoutFigure';

export interface DayPlan {
  /** 0 = Monday … 6 = Sunday */
  day: number;
  short: string;
  focus: string;
  exercises: ExerciseId[];
  rounds: number;
  workSec: number;
  restSec: number;
}

// A balanced 20-minute bodyweight week: harder days alternate with lighter
// ones and Sunday is active recovery, so it can be repeated week after week.
// Each day's sets × work + rests comes to ~20 minutes (see planSeconds).
export const WEEK_PLAN: DayPlan[] = [
  { day: 0, short: 'Mon', focus: 'Full body', exercises: ['jumping-jacks', 'squats', 'push-ups', 'lunges', 'plank'], rounds: 4, workSec: 45, restSec: 15 },
  { day: 1, short: 'Tue', focus: 'Cardio burn', exercises: ['jumping-jacks', 'high-knees', 'squats', 'high-knees'], rounds: 5, workSec: 40, restSec: 20 },
  { day: 2, short: 'Wed', focus: 'Legs', exercises: ['squats', 'lunges', 'high-knees', 'squats', 'lunges'], rounds: 4, workSec: 45, restSec: 15 },
  { day: 3, short: 'Thu', focus: 'Upper body & core', exercises: ['push-ups', 'plank', 'jumping-jacks', 'push-ups', 'plank'], rounds: 4, workSec: 45, restSec: 15 },
  { day: 4, short: 'Fri', focus: 'HIIT', exercises: ['high-knees', 'squats', 'push-ups', 'jumping-jacks'], rounds: 6, workSec: 40, restSec: 10 },
  { day: 5, short: 'Sat', focus: 'Strength endurance', exercises: ['lunges', 'push-ups', 'squats', 'plank'], rounds: 4, workSec: 60, restSec: 15 },
  { day: 6, short: 'Sun', focus: 'Active recovery', exercises: ['jumping-jacks', 'lunges', 'squats', 'plank'], rounds: 4, workSec: 50, restSec: 25 },
];

/** Monday-based index for a date (0 = Monday). */
export function weekdayIndex(d = new Date()): number {
  return (d.getDay() + 6) % 7;
}

/** The plan's exercises flattened across rounds. */
export function planSteps(plan: DayPlan): ExerciseId[] {
  return Array.from({ length: plan.rounds }, () => plan.exercises).flat();
}

export function planSeconds(plan: DayPlan): number {
  const n = plan.exercises.length * plan.rounds;
  return n * plan.workSec + Math.max(0, n - 1) * plan.restSec;
}

export function dateKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Date keys for Monday…Sunday of the current week. */
export function currentWeekKeys(now = new Date()): string[] {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekdayIndex(now));
  return Array.from({ length: 7 }, (_, i) => dateKey(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)));
}

export interface AlarmSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  /** Monday-based weekday indexes the alarm rings on. */
  days: number[];
  sound: boolean;
}

interface WorkoutState {
  alarm: AlarmSettings;
  /** Date keys (YYYY-MM-DD) of completed workouts. */
  completed: string[];
  /** True while the alarm overlay is showing (not persisted). */
  ringing: boolean;
  setAlarm: (patch: Partial<AlarmSettings>) => void;
  markCompleted: (key?: string) => void;
  ring: () => void;
  stopRinging: () => void;
}

const ALARM_KEY = 'lifeos-workout-alarm';
const DONE_KEY = 'lifeos-workout-done';
const DEFAULT_ALARM: AlarmSettings = { enabled: false, hour: 6, minute: 30, days: [0, 1, 2, 3, 4, 5, 6], sound: true };

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...fallback, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return fallback;
}

function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

export const useWorkout = create<WorkoutState>((set, get) => ({
  alarm: load(ALARM_KEY, DEFAULT_ALARM),
  completed: load<{ list: string[] }>(DONE_KEY, { list: [] }).list,
  ringing: false,
  ring: () => set({ ringing: true }),
  stopRinging: () => set({ ringing: false }),
  setAlarm: (patch) => {
    const alarm = { ...get().alarm, ...patch };
    save(ALARM_KEY, alarm);
    set({ alarm });
  },
  markCompleted: (key = dateKey()) => {
    // Keep roughly the last two months so storage stays small.
    const list = [...new Set([...get().completed, key])].sort().slice(-60);
    save(DONE_KEY, { list });
    set({ completed: list });
  },
}));
