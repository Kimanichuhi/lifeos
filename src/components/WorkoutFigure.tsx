import { useEffect, useRef, useState } from 'react';

// An athlete figure posed from 11 joints on a 200×200 canvas (ground at y=180).
// Each exercise is a loop of keyframe poses; the figure eases between them and
// the body (tapered limbs, clothes, head) is built around that skeleton.
// "L" limbs are the far side of the body and render shaded for depth.
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
  /** 1 = side view facing right, 0 = front view. */
  facing: 0 | 1;
}

const STAND_FRONT: Pose = {
  head: [100, 40], neck: [100, 54], hip: [100, 105],
  elbowL: [77, 80], handL: [74, 103], elbowR: [123, 80], handR: [126, 103],
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
  { id: 'jumping-jacks', name: 'Jumping Jacks', cue: 'Arms up, feet wide, land softly.', poses: [STAND_FRONT, JACK_OPEN], segmentMs: 450, facing: 0 },
  { id: 'squats', name: 'Squats', cue: 'Hips back, chest up, knees over toes.', poses: [STAND_SIDE_HANDS_FORWARD, SQUAT_DOWN], segmentMs: 900, facing: 1 },
  { id: 'push-ups', name: 'Push-ups', cue: 'Straight line from head to heels.', poses: [PUSH_UP, PUSH_DOWN], segmentMs: 850, facing: 1 },
  { id: 'high-knees', name: 'High Knees', cue: 'Drive knees to hip height, pump arms.', poses: [KNEE_NEAR, KNEE_FAR], segmentMs: 340, facing: 1 },
  { id: 'lunges', name: 'Lunges', cue: 'Step forward, back knee toward the floor.', poses: [STAND_SIDE_HANDS_HIPS, LUNGE_DOWN], segmentMs: 1000, facing: 1 },
  { id: 'plank', name: 'Plank', cue: 'Brace your core and breathe steadily.', poses: [PLANK_A, PLANK_B], segmentMs: 1600, hold: true, facing: 1 },
];

const JOINTS = Object.keys(STAND_FRONT) as (keyof Pose)[];

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = {} as Pose;
  for (const k of JOINTS) out[k] = [a[k][0] + (b[k][0] - a[k][0]) * t, a[k][1] + (b[k][1] - a[k][1]) * t];
  return out;
}

const ease = (u: number) => (1 - Math.cos(Math.PI * u)) / 2;

// Styled after the coach illustration (public/fitness.png): white tank top,
// black joggers, white sneakers. Colors sampled from the artwork.
const SKIN = '#a8653a';
const SKIN_SHADE = '#86492a';
const HAIR = '#1a1411';

const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const scale = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
const mix = (a: Pt, b: Pt, t: number): Pt => add(a, scale(sub(b, a), t));
function unit(v: Pt): Pt {
  const len = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / len, v[1] / len];
}
const f1 = (n: number) => n.toFixed(1);

/** Tapered capsule from a (radius ra) to b (radius rb) — one limb segment. */
function capsule(a: Pt, b: Pt, ra: number, rb: number): string {
  const d = unit(sub(b, a));
  const n: Pt = [-d[1], d[0]];
  const a1 = add(a, scale(n, ra)), a2 = sub(a, scale(n, ra));
  const b1 = add(b, scale(n, rb)), b2 = sub(b, scale(n, rb));
  return `M${f1(a1[0])},${f1(a1[1])}L${f1(b1[0])},${f1(b1[1])}`
    + `A${rb},${rb} 0 0 0 ${f1(b2[0])},${f1(b2[1])}`
    + `L${f1(a2[0])},${f1(a2[1])}`
    + `A${ra},${ra} 0 0 0 ${f1(a1[0])},${f1(a1[1])}Z`;
}

/** Shoulder and hip sockets derived from the spine: spread apart in front view, stacked in side view. */
function sockets(p: Pose, facing: 0 | 1) {
  const down = unit(sub(p.hip, p.neck));
  const across: Pt = [down[1], -down[0]]; // points to the figure's "R" (screen-right in front view)
  const chest = add(p.neck, scale(down, 6));
  const sw = facing ? 1.5 : 15;
  const hw = facing ? 1 : 5.5;
  return {
    chest,
    shoulderL: add(chest, scale(across, -sw)), shoulderR: add(chest, scale(across, sw)),
    hipL: add(p.hip, scale(across, -hw)), hipR: add(p.hip, scale(across, hw)),
  };
}

interface Palette { skin: string; pants: string; cuff: string }

const INK = { stroke: 'var(--wf-ink)', strokeWidth: 1.1, strokeLinejoin: 'round' as const };

function Arm({ shoulder, elbow, hand, c }: { shoulder: Pt; elbow: Pt; hand: Pt; c: Palette }) {
  return (
    <g fill={c.skin} {...INK}>
      <path d={capsule(shoulder, elbow, 6.2, 4.9)} />
      <path d={capsule(elbow, hand, 4.9, 3.8)} />
      <circle cx={hand[0]} cy={hand[1]} r="4.4" />
    </g>
  );
}

function Leg({ hip, knee, foot, facing, c }: { hip: Pt; knee: Pt; foot: Pt; facing: 0 | 1; c: Palette }) {
  const shin = unit(sub(foot, knee));
  const ankle = sub(foot, scale(shin, 3.5));
  // The shoe sits perpendicular to the shin, toes toward the facing side.
  const toeDir: Pt = [shin[1], -shin[0]];
  const heel = facing ? sub(ankle, scale(toeDir, 3.5)) : add(ankle, [-4, 0]);
  const toe = facing ? add(ankle, scale(toeDir, 11)) : add(ankle, [4, 0]);
  return (
    <g {...INK}>
      <path d={capsule(knee, mix(knee, ankle, 0.82), 7, 5.7)} fill={c.pants} />
      {/* jogger cuff */}
      <path d={capsule(mix(knee, ankle, 0.78), ankle, 5.5, 4.8)} fill={c.cuff} />
      <path d={capsule(hip, knee, 9, 7.2)} fill={c.pants} />
      <path d={capsule(heel, toe, 4.2, 3.6)} fill="var(--wf-shoe)" />
    </g>
  );
}

const NEAR: Palette = { skin: SKIN, pants: 'var(--wf-pants)', cuff: 'var(--wf-cuff)' };
const FAR: Palette = { skin: SKIN_SHADE, pants: 'var(--wf-pants-far)', cuff: 'var(--wf-pants-far)' };

/**
 * Animated athlete figure for one exercise. `onRep` fires each time the
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
  const { facing } = exercise;
  const s = sockets(p, facing);
  const [chestR, waistR] = facing ? [11, 9.5] : [13.5, 11];
  const down = unit(sub(p.hip, p.neck));
  const tilt = unit(sub(p.head, p.neck));
  const shadowX = (p.footL[0] + p.footR[0] + p.hip[0]) / 3;

  return (
    <svg
      viewBox="0 0 200 200"
      className={`[--wf-ink:#1f2328] [--wf-pants:#262a33] [--wf-pants-far:#16181d] [--wf-cuff:#1c1f26] [--wf-shoe:#f8fafc] [--wf-tank:#ffffff]
        dark:[--wf-ink:#64748b] dark:[--wf-pants:#3a404d] dark:[--wf-pants-far:#2a2f39] dark:[--wf-cuff:#323844] ${className ?? ''}`}
      role="img"
      aria-label={`${exercise.name} demonstration`}
    >
      <line x1="16" y1="182" x2="184" y2="182" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx={shadowX} cy="182" rx={facing ? 46 : 30} ry="3.5" className="fill-slate-900/10 dark:fill-black/40" />

      {/* far side, shaded */}
      <Leg hip={s.hipL} knee={p.kneeL} foot={p.footL} facing={facing} c={FAR} />
      <Arm shoulder={s.shoulderL} elbow={p.elbowL} hand={p.handL} c={FAR} />

      {/* waistband, then the tank top hanging over it */}
      <path d={capsule(mix(p.neck, p.hip, 0.8), p.hip, waistR + 0.6, waistR + 1.2)} fill="var(--wf-pants)" {...INK} />
      {/* torso starts below the neck so the tank's rounded top sits at the shoulders */}
      <path d={capsule(add(p.neck, scale(down, chestR - 3)), add(p.hip, scale(down, 2)), chestR, waistR)} fill="var(--wf-tank)" {...INK} />
      <path d={capsule(add(p.neck, scale(down, 4)), mix(p.neck, p.head, 0.55), 5.2, 4.8)} fill={SKIN} {...INK} />
      {/* scoop neckline */}
      <path d={capsule(p.neck, add(p.neck, scale(down, 6)), 5, 3.6)} fill={SKIN} />

      {/* near side */}
      <Leg hip={s.hipR} knee={p.kneeR} foot={p.footR} facing={facing} c={NEAR} />
      <Arm shoulder={s.shoulderR} elbow={p.elbowR} hand={p.handR} c={NEAR} />

      {/* plain dummy head: close-cropped hair over the crown/back, ear in side view */}
      <circle cx={p.head[0]} cy={p.head[1]} r="11" fill={SKIN} {...INK} />
      <path
        d={facing
          ? `M${f1(p.head[0] + 5.3)},${f1(p.head[1] - 9.2)}A10.6,10.6 0 0 0 ${f1(p.head[0] - 9.2)},${f1(p.head[1] + 5.3)}`
            + `Q${f1(p.head[0] - 2)},${f1(p.head[1] - 3)} ${f1(p.head[0] + 5.3)},${f1(p.head[1] - 9.2)}Z`
          : `M${f1(p.head[0] - 10.6)},${f1(p.head[1] - 1)}A10.6,10.6 0 0 1 ${f1(p.head[0] + 10.6)},${f1(p.head[1] - 1)}`
          + `Q${f1(p.head[0])},${f1(p.head[1] - 7)} ${f1(p.head[0] - 10.6)},${f1(p.head[1] - 1)}Z`}
        fill={HAIR}
        transform={`rotate(${f1((Math.atan2(tilt[0], -tilt[1]) * 180) / Math.PI)} ${f1(p.head[0])} ${f1(p.head[1])})`}
      />
      {facing === 1 && <ellipse cx={p.head[0] - 2} cy={p.head[1] + 1.5} rx="2.2" ry="3" fill={SKIN_SHADE} {...INK} strokeWidth={0.8} />}
    </svg>
  );
}
