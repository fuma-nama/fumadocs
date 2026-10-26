import type { ReactNode } from 'react';
import {
  BAND,
  CRANK,
  DANCER,
  DRIVER,
  DRIVER_PULLEY,
  DRUM_R,
  DRUMS,
  FRAME_H,
  FRAME_W,
  FULL,
  GATE,
  GAUGE,
  GENEVA_C,
  H,
  LOCK,
  MOTOR,
  NEEDLE_REST,
  NEEDLE_SWEEP,
  PULLEY,
  reels,
  ROLLER,
  ROLLERS,
  STRIP_Y,
  W,
  WHEEL,
} from './film';

/** strokes stay 1px at any size */
const LINE = { vectorEffect: 'non-scaling-stroke' } as const;
const PART = 'fill-lp-paper stroke-lp-ink-2';

type Point = readonly [number, number];

function at(c: Point, r: number, a: number): [number, number] {
  return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];
}

function n(v: number) {
  return +v.toFixed(2);
}

function p([x, y]: Point) {
  return `${n(x)} ${n(y)}`;
}

/** a slotted screw head */
function Screw({ x, y, r = 2.4, angle }: { x: number; y: number; r?: number; angle: number }) {
  const a = (angle * Math.PI) / 180;
  const dx = Math.cos(a) * r * 0.6;
  const dy = Math.sin(a) * r * 0.6;
  return (
    <>
      <circle cx={n(x)} cy={n(y)} r={r} className={PART} style={LINE} />
      <path
        d={`M${n(x - dx)} ${n(y - dy)}L${n(x + dx)} ${n(y + dy)}`}
        className="stroke-lp-ink-2"
        style={LINE}
      />
    </>
  );
}

/** the 4-slot wheel at rest: its slots at 45° + k·90°, a concave lock between each two */
function wheelPath(): string {
  const c = WHEEL;
  const out = CRANK + 2.2;
  const half = 2.6;
  const inner = GENEVA_C - CRANK - 1.4;
  const swing = Math.acos((out * out + GENEVA_C * GENEVA_C - LOCK * LOCK) / (2 * out * GENEVA_C));
  const edge = Math.asin(half / out);
  let d = '';
  for (let k = 0; k < 4; k++) {
    const s = Math.PI / 4 + (k * Math.PI) / 2;
    const side = (t: number, sign: number): Point => [
      c[0] + Math.cos(s) * t - Math.sin(s) * half * sign,
      c[1] + Math.sin(s) * t + Math.cos(s) * half * sign,
    ];
    const along = out * Math.cos(edge);
    d += `${k === 0 ? 'M' : 'L'}${p(side(along, -1))}L${p(side(inner, -1))}A${half} ${half} 0 0 0 ${p(side(inner, 1))}L${p(side(along, 1))}`;
    const between = s + Math.PI / 4;
    d += `A${n(out)} ${n(out)} 0 0 1 ${p(at(c, out, between - swing))}`;
    d += `A${LOCK} ${LOCK} 0 0 0 ${p(at(c, out, between + swing))}`;
    d += `A${n(out)} ${n(out)} 0 0 1 ${p(at(c, out, s + Math.PI / 2 - edge))}`;
  }
  return `${d}Z`;
}

/** the driver with its pin toward the wheel: a locking disc relieved on the pin's side, the crank */
function driverPaths(): { disc: string; crank: string; pin: Point } {
  const a = Math.PI;
  const lock = LOCK - 0.8;
  const relief = CRANK + 3;
  const x = (GENEVA_C * GENEVA_C - relief * relief + lock * lock) / (2 * GENEVA_C);
  const y = Math.sqrt(lock * lock - x * x);
  const u: Point = [Math.cos(a), Math.sin(a)];
  const one: Point = [DRIVER[0] + u[0] * x - u[1] * y, DRIVER[1] + u[1] * x + u[0] * y];
  const two: Point = [DRIVER[0] + u[0] * x + u[1] * y, DRIVER[1] + u[1] * x - u[0] * y];
  const disc = `M${p(one)}A${n(lock)} ${n(lock)} 0 1 0 ${p(two)}A${n(relief)} ${n(relief)} 0 0 1 ${p(one)}Z`;
  const pin = at(DRIVER, CRANK, a);
  const w = 3.2;
  const crank = `M${p(at(DRIVER, w, a + Math.PI / 2))}L${p(at(pin, w, a + Math.PI / 2))}A${w} ${w} 0 0 0 ${p(at(pin, w, a - Math.PI / 2))}L${p(at(DRIVER, w, a - Math.PI / 2))}A${w} ${w} 0 0 0 ${p(at(DRIVER, w, a + Math.PI / 2))}Z`;
  return { disc, crank, pin };
}

/** the open belt from the motor's pulley to the driver's: its two outer tangents */
function beltPath(): string {
  const dx = DRIVER[0] - MOTOR[0];
  const dy = DRIVER[1] - MOTOR[1];
  const base = Math.atan2(dy, dx);
  const off = Math.acos((PULLEY - DRIVER_PULLEY) / Math.hypot(dx, dy));
  return `M${p(at(MOTOR, PULLEY, base + off))}L${p(at(DRIVER, DRIVER_PULLEY, base + off))}M${p(at(MOTOR, PULLEY, base - off))}L${p(at(DRIVER, DRIVER_PULLEY, base - off))}`;
}

/** an annular sector of a drum's door, the sight window onto the wound film's edge */
function sector(c: Point, from: number, to: number, inner: number, outer: number): string {
  const a = (from * Math.PI) / 180;
  const b = (to * Math.PI) / 180;
  return `M${p(at(c, inner, a))}L${p(at(c, outer, a))}A${outer} ${outer} 0 0 1 ${p(at(c, outer, b))}L${p(at(c, inner, b))}A${inner} ${inner} 0 0 0 ${p(at(c, inner, a))}Z`;
}

/** a drum, the magazine its reel turns in: housing, door, sight window, spindle, foot, light trap */
function Drum({ id, side, wound }: { id: keyof typeof DRUMS; side: -1 | 1; wound: number }) {
  const c = DRUMS[id];
  const sight =
    side < 0 ? sector(c, 118, 242, 14, DRUM_R - 11) : sector(c, -62, 62, 14, DRUM_R - 11);
  let rings = '';
  for (let r = 12; r <= FULL; r += 2)
    rings += `M${n(c[0] - r)} ${c[1]}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;
  const foot = c[1] + DRUM_R - 6;
  const mouth = side < 0 ? c[0] + DRUM_R - 6 : c[0] - DRUM_R - 12;
  const screws: ReactNode[] = [];
  for (const angle of [45, 135, 225, 315]) {
    const [x, y] = at(c, DRUM_R - 3, (angle * Math.PI) / 180);
    screws.push(<Screw key={angle} x={x} y={y} r={2.1} angle={angle + 30} />);
  }
  let spokes = '';
  for (let k = 0; k < 3; k++) {
    const a = (k * 2 * Math.PI) / 3 + Math.PI / 6;
    const u: Point = [Math.cos(a), Math.sin(a)];
    const v: Point = [-u[1] * 2.6, u[0] * 2.6];
    const from = at(c, 11, a);
    const to = at(c, FULL + 1, a);
    spokes += `M${p([from[0] + v[0], from[1] + v[1]])}L${p([to[0] + v[0], to[1] + v[1]])}L${p([to[0] - v[0], to[1] - v[1]])}L${p([from[0] - v[0], from[1] - v[1]])}Z`;
  }

  return (
    <g>
      <path
        d={`M${c[0] - 14.5} ${foot}h29l7 ${H - foot - 0.5}h-43z`}
        className={PART}
        style={LINE}
      />
      <circle
        cx={c[0]}
        cy={c[1]}
        r={DRUM_R}
        className="fill-lp-paper stroke-lp-line-strong"
        style={LINE}
      />
      <circle cx={c[0]} cy={c[1]} r={DRUM_R - 6} className="stroke-lp-ink-2" style={LINE} />
      {screws}
      <clipPath id={`sight-${id}`}>
        <path d={sight} />
      </clipPath>
      <clipPath id={`wound-${id}`}>
        <circle data-part={`wound-${id}`} cx={c[0]} cy={c[1]} r={n(wound)} />
      </clipPath>
      <path d={sight} className={PART} style={LINE} />
      {/* through the window: the reel's spokes, and over them the film wound on it so far */}
      <g clipPath={`url(#sight-${id})`}>
        <path data-spin={id} d={spokes} className={PART} style={LINE} />
        <g clipPath={`url(#wound-${id})`}>
          <circle cx={c[0]} cy={c[1]} r={FULL} className="fill-lp-paper-2" />
          <path d={rings} className="stroke-lp-ink-2" style={LINE} />
        </g>
      </g>
      <circle cx={c[0]} cy={c[1]} r={10} className={PART} style={LINE} />
      <g data-spin={id}>
        <path d={`M${c[0] - 6.5} ${c[1] - 1.5}h13v3h-13z`} className="fill-lp-ink-2" />
        <circle cx={c[0]} cy={c[1] + 7.2} r={0.9} className="fill-lp-ink-2" />
      </g>
      <path
        d={`M${mouth + 0.5} ${STRIP_Y - BAND / 2 - 7.5}h17v${BAND + 15}h-17z`}
        className={PART}
        style={LINE}
      />
      <path
        d={`M${mouth + (side < 0 ? 17 : 1)} ${STRIP_Y - BAND / 2}v${BAND}`}
        strokeWidth={3}
        strokeDasharray="1 1.5"
        className="stroke-lp-ink-2"
      />
      <Screw x={mouth + 9} y={STRIP_Y - BAND / 2 - 3.5} r={1.9} angle={20} />
      <Screw x={mouth + 9} y={STRIP_Y + BAND / 2 + 3.5} r={1.9} angle={-40} />
    </g>
  );
}

/** an idler roller under the strip, holes to show it turn */
function Roller({ c, index }: { c: Point; index: number }) {
  const holes: ReactNode[] = [];
  for (let k = 0; k < 3; k++) {
    const [x, y] = at(c, 4.4, (k * 2 * Math.PI) / 3);
    holes.push(<circle key={k} cx={n(x)} cy={n(y)} r={1.2} className="fill-lp-ink-2" />);
  }
  return (
    <g>
      <circle cx={c[0]} cy={c[1]} r={ROLLER} className={PART} style={LINE} />
      <g data-part={`roller-${index}`}>{holes}</g>
    </g>
  );
}

/** the speed gauge's ticks, from stopped to flat out */
function gaugeTicks(): string {
  let d = '';
  for (let i = 0; i <= 6; i++) {
    const a = ((NEEDLE_REST + (i * NEEDLE_SWEEP) / 6 - 90) * Math.PI) / 180;
    d += `M${p(at(GAUGE, 6.4, a))}L${p(at(GAUGE, 8.4, a))}`;
  }
  return d;
}

/** the top of the gauge's scale, where a rewind pins the needle */
function gaugeRed(): string {
  const a = ((NEEDLE_REST + NEEDLE_SWEEP * 0.75 - 90) * Math.PI) / 180;
  const b = ((NEEDLE_REST + NEEDLE_SWEEP - 90) * Math.PI) / 180;
  return `M${p(at(GAUGE, 7.6, a))}A7.6 7.6 0 0 1 ${p(at(GAUGE, 7.6, b))}`;
}

/** under the strip: the drums, the motor, the Geneva drive, the rollers; the reel at its start */
export function DeckBack({ count }: { count: number }) {
  const driver = driverPaths();
  const [take, feed] = reels(0, count);
  let fins = '';
  for (let x = MOTOR[0] + 12; x <= MOTOR[0] + 47; x += 3.5) fins += `M${n(x)} ${MOTOR[1] - 9}v18`;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${W} ${H}`}
      fill="none"
      className="absolute inset-0 size-full overflow-visible"
    >
      <Drum id="take" side={-1} wound={take} />
      <Drum id="feed" side={1} wound={feed} />
      {/* the motor, belted to the driver: its start capacitor, the gauge of its speed, its cable */}
      <path d={`M${MOTOR[0] + 3} ${MOTOR[1] - 1.5}h5v3h-5z`} className={PART} style={LINE} />
      <path d={`M${MOTOR[0] + 7.5} ${MOTOR[1] - 13.5}h44v27h-44z`} className={PART} style={LINE} />
      <path d={fins} className="stroke-lp-ink-2" style={LINE} />
      <path
        d={`M${MOTOR[0] + 17.5} ${MOTOR[1] + 13.5}h24v${H - MOTOR[1] - 14}h-24z`}
        className={PART}
        style={LINE}
      />
      <Screw x={MOTOR[0] + 22} y={MOTOR[1] + 18.5} r={1.7} angle={30} />
      <Screw x={MOTOR[0] + 37} y={MOTOR[1] + 18.5} r={1.7} angle={-50} />
      <path
        d={`M${MOTOR[0] + 14} ${MOTOR[1] - 14}v-2M${MOTOR[0] + 20} ${MOTOR[1] - 14}v-2`}
        className="stroke-lp-ink-2"
        style={LINE}
      />
      <rect
        x={MOTOR[0] + 11.5}
        y={MOTOR[1] - 22.5}
        width={12}
        height={7}
        rx={3.5}
        className={PART}
        style={LINE}
      />
      <path
        d={`M${MOTOR[0] + 15} ${MOTOR[1] - 22.5}v7M${MOTOR[0] + 17} ${MOTOR[1] - 22.5}v7`}
        className="stroke-lp-ink-2"
        style={LINE}
      />
      <path
        d={`M${GAUGE[0] - 9.5} ${GAUGE[1]}a9.5 9.5 0 0 1 19 0z`}
        className={PART}
        style={LINE}
      />
      <path d={gaugeTicks()} className="stroke-lp-ink-2" style={LINE} />
      <path d={gaugeRed()} strokeWidth={2} className="stroke-lp-sun" />
      <g data-part="needle" transform={`rotate(${NEEDLE_REST} ${GAUGE[0]} ${GAUGE[1]})`}>
        <path d={`M${GAUGE[0]} ${GAUGE[1]}v-7.5`} strokeWidth={1.2} className="stroke-lp-ink" />
      </g>
      <circle cx={GAUGE[0]} cy={GAUGE[1]} r={1.4} className="fill-lp-ink" />
      <path
        d={`M${MOTOR[0] + 51.5} ${MOTOR[1] + 3}c9 0 13 5 15 11s2 ${H - MOTOR[1] - 20} 2 ${H - MOTOR[1] - 17}`}
        strokeWidth={2.2}
        strokeLinecap="round"
        className="stroke-lp-ink-2"
      />
      <path d={`M${MOTOR[0] + 64.5} ${H - 5.5}h7v5h-7z`} className="fill-lp-ink-2" />
      <path
        data-part="belt"
        d={beltPath()}
        strokeWidth={2}
        strokeDasharray="3 2"
        className="stroke-lp-ink-2"
      />
      <circle cx={MOTOR[0]} cy={MOTOR[1]} r={PULLEY} className={PART} style={LINE} />
      <g data-part="pulley">
        <circle cx={MOTOR[0] + 2.6} cy={MOTOR[1]} r={1.1} className="fill-lp-ink-2" />
      </g>
      {/* the Geneva drive: the wheel turns the gate's sprocket, the driver's pin turns the wheel */}
      <circle cx={DRIVER[0]} cy={DRIVER[1]} r={DRIVER_PULLEY} className={PART} style={LINE} />
      <g data-part="wheel">
        <path d={wheelPath()} className={PART} style={LINE} />
        <circle cx={WHEEL[0]} cy={WHEEL[1]} r={5.5} className={PART} style={LINE} />
        <circle cx={WHEEL[0]} cy={WHEEL[1]} r={1.6} className="fill-lp-ink-2" />
      </g>
      <g data-part="driver" transform={`rotate(-180 ${DRIVER[0]} ${DRIVER[1]})`}>
        <path d={driver.disc} className={PART} style={LINE} />
        <path d={driver.crank} className={PART} style={LINE} />
        <circle cx={n(driver.pin[0])} cy={n(driver.pin[1])} r={2} className="fill-lp-ink-2" />
        <circle cx={DRIVER[0]} cy={DRIVER[1]} r={1.6} className="fill-lp-ink-2" />
      </g>
      <Roller c={ROLLERS[0]} index={0} />
      <Roller c={ROLLERS[1]} index={1} />
    </svg>
  );
}

/** over the strip: the gate and its pressure spring, the pickup cable to the viewer, the dancer arm */
export function DeckFront() {
  const top = STRIP_Y - 32;
  let spring = `M${GATE} ${top}`;
  for (let i = 1; i <= 5; i++) spring += `L${GATE + (i % 2 ? 5 : -5)} ${n(top - i * 2.4)}`;
  spring += `L${GATE} ${top - 14}`;

  const { pivot, length, rest, roller } = DANCER;
  const a = (rest * Math.PI) / 180;
  const end = at(pivot, length, a);
  const mid = at(pivot, length * 0.55, a);
  let coil = `M${p(mid)}`;
  for (let i = 1; i <= 6; i++) coil += `L${n(mid[0] + (i % 2 ? 3 : -3))} ${n(mid[1] - i * 3.4)}`;
  coil += `L${n(mid[0])} ${n(mid[1] - 24)}`;
  const arm = 2.6;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${W} ${H}`}
      fill="none"
      className="absolute inset-0 size-full overflow-visible"
    >
      {/* the gate: an aperture plate holding the frame flat, screwed down */}
      <path
        fillRule="evenodd"
        d={`M${GATE - 41.5} ${top + 0.5}h83v63h-83zM${GATE - FRAME_W / 2 - 1.5} ${STRIP_Y - FRAME_H / 2 - 1.5}h${FRAME_W + 3}v${FRAME_H + 3}h${-FRAME_W - 3}z`}
        className="fill-lp-paper stroke-lp-line-strong"
        style={LINE}
      />
      <Screw x={GATE - 37} y={top + 5} angle={30} />
      <Screw x={GATE + 37} y={top + 5} angle={-20} />
      <Screw x={GATE - 37} y={top + 59} angle={70} />
      <Screw x={GATE + 37} y={top + 59} angle={10} />
      <path d={spring} className="stroke-lp-ink-2" style={LINE} />
      <path d={`M${GATE - 20.5} ${top - 19.5}h41v6h-41z`} className={PART} style={LINE} />
      <Screw x={GATE - 15} y={top - 16.5} r={1.8} angle={0} />
      <Screw x={GATE + 15} y={top - 16.5} r={1.8} angle={60} />
      <path
        d={`M${GATE - 2} ${top - 20}V4M${GATE + 2} ${top - 20}V4`}
        className="stroke-lp-ink-2"
        style={LINE}
      />
      <path d={`M${GATE - 4.5} -1.5h9v6h-9z`} className="fill-lp-ink-2" />
      {/* the dancer: a spring holds its roller down on the strip, it gives when the strip jumps */}
      <path d={coil} className="stroke-lp-ink-2" style={LINE} />
      <path d={`M${n(mid[0] - 9.5)} ${n(mid[1] - 29.5)}h19v6h-19z`} className={PART} style={LINE} />
      <Screw x={mid[0] - 5} y={mid[1] - 26.5} r={1.6} angle={40} />
      <Screw x={mid[0] + 5} y={mid[1] - 26.5} r={1.6} angle={-30} />
      <g data-part="dancer">
        <path
          d={`M${p(at(pivot, arm, a - Math.PI / 2))}L${p(at(end, arm, a - Math.PI / 2))}L${p(at(end, arm, a + Math.PI / 2))}L${p(at(pivot, arm, a + Math.PI / 2))}Z`}
          className={PART}
          style={LINE}
        />
        <circle cx={n(end[0])} cy={n(end[1])} r={roller} className={PART} style={LINE} />
        <circle cx={n(end[0])} cy={n(end[1])} r={1.5} className="fill-lp-ink-2" />
      </g>
      <circle cx={pivot[0]} cy={pivot[1]} r={3.4} className={PART} style={LINE} />
      <circle cx={pivot[0]} cy={pivot[1]} r={1.1} className="fill-lp-ink-2" />
    </svg>
  );
}
