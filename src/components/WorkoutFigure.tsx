import { useEffect, useRef, useState } from 'react';

// A stick figure drawn from 11 joints on a 200×200 canvas (ground at y=180).
// Each exercise is a loop of keyframe poses; the figure eases between them.
// "L" limbs are the far side of the body and render fainter for depth.
type Pt = [number, number];
export interface Pose {
  head: Pt; neck: Pt; hip: Pt;
  elbowL: Pt; handL: Pt; elbowR: Pt; handR: Pt;
  kneeL: Pt; footL: Pt; kneeR: Pt; footR: Pt;
}

export type ExerciseId = 'jumping-jacks' | 'squats' | 'push-ups' | 'high-knees' | 'lunges' | 'plank';

export interface Exercise {
  id: ExerciseId;
  name: string;
  cue: string;
  /** Poses visited in order; the loop returns to the first. */
  poses: Pose[];
  /** Milliseconds spent moving into each pose. */
  segmentMs: number;
  /** Timed holds don't count reps. */
  hold?: boolean;
}

const STAND_FRONT: Pose = {
  head: [100, 40], neck: [100, 54], hip: [100, 105],
  elbowL: [88, 78], handL: [84, 102], elbowR: [112, 78], handR: [116, 102],
  kneeL: [94, 142], footL: [92, 180], kneeR: [106, 142], footR: [108, 180],
};

const JACK_OPEN: Pose = {
  head: [100, 36], neck: [100, 50], hip: [100, 101],
  elbowL: [78, 40], handL: [68, 16], elbowR: [122, 40], handR: [132, 16],
  kneeL: [82, 140], footL: [68, 178], kneeR: [118, 140], footR: [132, 178],
};

const STAND_SIDE_HANDS_FORWARD: Pose = {
  head: [100, 40], neck: [100, 54], hip: [100, 105],
  elbowL: [101, 79], handL: [103, 103], elbowR: [103, 79], handR: [105, 103],
  kneeL: [99, 142], footL: [98, 180], kneeR: [102, 142], footR: [102, 180],
};

const SQUAT_DOWN: Pose = {
  head: [104, 76], neck: [100, 90], hip: [78, 134],
  elbowL: [116, 94], handL: [138, 94], elbowR: [118, 96], handR: [140, 96],
  kneeL: [110, 140], footL: [98, 180], kneeR: [114, 142], footR: [102, 180],
};

const PUSH_UP: Pose = {
  head: [154, 112], neck: [140, 120], hip: [90, 144],
  elbowL: [139, 150], handL: [138, 180], elbowR: [142, 150], handR: [142, 180],
  kneeL: [64, 157], footL: [38, 172], kneeR: [66, 158], footR: [40, 174],
};

const PUSH_DOWN: Pose = {
  head: [156, 146], neck: [141, 152], hip: [90, 162],
  elbowL: [120, 160], handL: [138, 180], elbowR: [123, 161], handR: [142, 180],
  kneeL: [64, 168], footL: [38, 176], kneeR: [66, 169], footR: [40, 177],
};

// Side view: the raised knee drives forward to hip height, opposite arm pumps.
const KNEE_NEAR: Pose = {
  head: [100, 38], neck: [100, 52], hip: [100, 103],
  elbowL: [110, 78], handL: [122, 64], elbowR: [90, 76], handR: [86, 98],
  kneeL: [100, 141], footL: [100, 178], kneeR: [126, 102], footR: [122, 140],
};

const KNEE_FAR: Pose = {
  head: [100, 38], neck: [100, 52], hip: [100, 103],
  elbowL: [90, 76], handL: [86, 98], elbowR: [110, 78], handR: [122, 64],
  kneeL: [126, 102], footL: [122, 140], kneeR: [100, 141], footR: [100, 178],
};

const STAND_SIDE_HANDS_HIPS: Pose = {
  head: [100, 40], neck: [100, 54], hip: [100, 105],
  elbowL: [88, 82], handL: [98, 104], elbowR: [90, 84], handR: [100, 106],
  kneeL: [99, 142], footL: [98, 180], kneeR: [102, 142], footR: [102, 180],
};

const LUNGE_DOWN: Pose = {
  head: [100, 68], neck: [100, 82], hip: [100, 132],
  elbowL: [88, 110], handL: [98, 132], elbowR: [90, 112], handR: [100, 134],
  kneeL: [84, 172], footL: [58, 178], kneeR: [132, 144], footR: [132, 180],
};

const PLANK_A: Pose = {
  head: [152, 132], neck: [138, 140], hip: [90, 154],
  elbowL: [134, 178], handL: [158, 178], elbowR: [137, 178], handR: [161, 178],
  kneeL: [64, 165], footL: [38, 176], kneeR: [66, 166], footR: [40, 177],
};

const PLANK_B: Pose = { ...PLANK_A, hip: [90, 151], neck: [138, 139], head: [152, 131] };

export const EXERCISES: Exercise[] = [
  { id: 'jumping-jacks', name: 'Jumping Jacks', cue: 'Arms up, feet wide, land softly.', poses: [STAND_FRONT, JACK_OPEN], segmentMs: 450 },
  { id: 'squats', name: 'Squats', cue: 'Hips back, chest up, knees over toes.', poses: [STAND_SIDE_HANDS_FORWARD, SQUAT_DOWN], segmentMs: 900 },
  { id: 'push-ups', name: 'Push-ups', cue: 'Straight line from head to heels.', poses: [PUSH_UP, PUSH_DOWN], segmentMs: 850 },
  { id: 'high-knees', name: 'High Knees', cue: 'Drive knees to hip height, pump arms.', poses: [KNEE_NEAR, KNEE_FAR], segmentMs: 340 },
  { id: 'lunges', name: 'Lunges', cue: 'Step forward, back knee toward the floor.', poses: [STAND_SIDE_HANDS_HIPS, LUNGE_DOWN], segmentMs: 1000 },
  { id: 'plank', name: 'Plank', cue: 'Brace your core and breathe steadily.', poses: [PLANK_A, PLANK_B], segmentMs: 1600, hold: true },
];

const JOINTS = Object.keys(STAND_FRONT) as (keyof Pose)[];

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = {} as Pose;
  for (const k of JOINTS) out[k] = [a[k][0] + (b[k][0] - a[k][0]) * t, a[k][1] + (b[k][1] - a[k][1]) * t];
  return out;
}

const ease = (u: number) => (1 - Math.cos(Math.PI * u)) / 2;
const pts = (...p: Pt[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/**
 * Animated stick figure for one exercise. `onRep` fires each time the
 * movement loop completes (never for holds).
 */
export function WorkoutFigure({ exercise, playing, onRep, className }: {
  exercise: Exercise;
  playing: boolean;
  onRep?: () => void;
  className?: string;
}) {
  const [pose, setPose] = useState<Pose>(exercise.poses[0]);
  const elapsed = useRef(0);
  const onRepRef = useRef(onRep);
  onRepRef.current = onRep;

  // Restart the loop when the exercise changes.
  useEffect(() => {
    elapsed.current = 0;
    setPose(exercise.poses[0]);
  }, [exercise]);

  useEffect(() => {
    if (!playing) return;
    const { poses, segmentMs, hold } = exercise;
    const cycleMs = poses.length * segmentMs;
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const before = Math.floor(elapsed.current / cycleMs);
      // rAF timestamps are frame-start times and can precede `last`.
      elapsed.current += Math.max(0, now - last);
      last = now;
      if (!hold && Math.floor(elapsed.current / cycleMs) > before) onRepRef.current?.();
      const inCycle = elapsed.current % cycleMs;
      const seg = Math.floor(inCycle / segmentMs);
      const u = (inCycle - seg * segmentMs) / segmentMs;
      setPose(lerpPose(poses[seg], poses[(seg + 1) % poses.length], ease(u)));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [exercise, playing]);

  const p = pose;
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={`${exercise.name} demonstration`}>
      <line x1="16" y1="182" x2="184" y2="182" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="3" strokeLinecap="round" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" style={{ stroke: 'rgb(var(--accent-500))' }}>
        <g opacity="0.45">
          <polyline points={pts(p.neck, p.elbowL, p.handL)} />
          <polyline points={pts(p.hip, p.kneeL, p.footL)} />
        </g>
        <line x1={p.neck[0]} y1={p.neck[1]} x2={p.hip[0]} y2={p.hip[1]} strokeWidth="8" />
        <polyline points={pts(p.hip, p.kneeR, p.footR)} />
        <polyline points={pts(p.neck, p.elbowR, p.handR)} />
      </g>
      <circle cx={p.head[0]} cy={p.head[1]} r="12" style={{ fill: 'rgb(var(--accent-500))' }} />
    </svg>
  );
}
