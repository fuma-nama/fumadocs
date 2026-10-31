import type { ReactNode } from 'react';
import {
  BAND,
  CRANK,
  DRIVER,
  FRAME_H,
  FRAME_W,
  GATE,
  GENEVA_C,
  H,
  LEADER,
  LOCK,
  STRIP_Y,
  W,
  WHEEL,
} from './engine';

/** the drums the reels sit in, and the radius of film wound on a reel: empty to full */
const DRUM_R = 56;
const DRUMS = { take: [68, STRIP_Y], feed: [572, STRIP_Y] } as const;
const HUB = 12;
const FULL = 44;

/** hairlines: 1px at any size */
const INK = 'stroke-lp-ink-2 [vector-effect:non-scaling-stroke]';
const PART = `fill-lp-paper ${INK}`;
const FRAME = 'fill-lp-paper stroke-lp-line-strong [vector-effect:non-scaling-stroke]';

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

function Screw({ x, y, r = 2.4, angle }: { x: number; y: number; r?: number; angle: number }) {
  const a = (angle * Math.PI) / 180;
  const dx = Math.cos(a) * r * 0.6;
  const dy = Math.sin(a) * r * 0.6;
  return (
    <>
      <circle cx={n(x)} cy={n(y)} r={r} className={PART} />
      <path d={`M${n(x - dx)} ${n(y - dy)}L${n(x + dx)} ${n(y + dy)}`} className={INK} />
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

function sector(c: Point, from: number, to: number, inner: number, outer: number): string {
  const a = (from * Math.PI) / 180;
  const b = (to * Math.PI) / 180;
  return `M${p(at(c, inner, a))}L${p(at(c, outer, a))}A${outer} ${outer} 0 0 1 ${p(at(c, outer, b))}L${p(at(c, inner, b))}A${inner} ${inner} 0 0 0 ${p(at(c, inner, a))}Z`;
}

/** the radius of film on a reel holding `share` of the reel, by the area of film kept */
function wound(share: number): number {
  return Math.sqrt(HUB * HUB + share * (FULL * FULL - HUB * HUB));
}

function Drum({ id, side, film }: { id: keyof typeof DRUMS; side: -1 | 1; film: number }) {
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
      <path d={`M${c[0] - 14.5} ${foot}h29l7 ${H - foot - 0.5}h-43z`} className={PART} />
      <circle cx={c[0]} cy={c[1]} r={DRUM_R} className={FRAME} />
      <circle cx={c[0]} cy={c[1]} r={DRUM_R - 6} className={INK} />
      {screws}
      <clipPath id={`sight-${id}`}>
        <path d={sight} />
      </clipPath>
      <clipPath id={`wound-${id}`}>
        <circle cx={c[0]} cy={c[1]} r={n(film)} />
      </clipPath>
      <path d={sight} className={PART} />
      {/* through the window: the reel's spokes, and over them the film wound on it */}
      <g clipPath={`url(#sight-${id})`}>
        <path d={spokes} className={PART} />
        <g clipPath={`url(#wound-${id})`}>
          <circle cx={c[0]} cy={c[1]} r={FULL} className="fill-lp-paper-2" />
          <path d={rings} className={INK} />
        </g>
      </g>
      <circle cx={c[0]} cy={c[1]} r={10} className={PART} />
      <path d={`M${c[0] - 6.5} ${c[1] - 1.5}h13v3h-13z`} className="fill-lp-ink-2" />
      <circle cx={c[0]} cy={c[1] + 7.2} r={0.9} className="fill-lp-ink-2" />
      <path
        d={`M${mouth + 0.5} ${STRIP_Y - BAND / 2 - 7.5}h17v${BAND + 15}h-17z`}
        className={PART}
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

/** under the strip: the drums with the reel at its start, the Geneva drive */
export function DeckBack({ count }: { count: number }) {
  const driver = driverPaths();
  // the take-up reel holds the leader, the feed reel the rest
  const taken = LEADER / (count + LEADER * 2);

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${W} ${H}`}
      fill="none"
      className="absolute inset-0 size-full overflow-visible"
    >
      <Drum id="take" side={-1} film={wound(taken)} />
      <Drum id="feed" side={1} film={wound(1 - taken)} />
      {/* the Geneva drive: the wheel turns the gate's sprocket, the driver's pin turns the wheel */}
      <g data-part="wheel">
        <path d={wheelPath()} className={PART} />
        <circle cx={WHEEL[0]} cy={WHEEL[1]} r={5.5} className={PART} />
        <circle cx={WHEEL[0]} cy={WHEEL[1]} r={1.6} className="fill-lp-ink-2" />
      </g>
      <g data-part="driver" transform={`rotate(-180 ${DRIVER[0]} ${DRIVER[1]})`}>
        <path d={driver.disc} className={PART} />
        <path d={driver.crank} className={PART} />
        <circle cx={n(driver.pin[0])} cy={n(driver.pin[1])} r={2} className="fill-lp-ink-2" />
        <circle cx={DRIVER[0]} cy={DRIVER[1]} r={1.6} className="fill-lp-ink-2" />
      </g>
    </svg>
  );
}

/** over the strip: the gate and its pressure spring, the pickup cable to the viewer */
export function DeckFront() {
  const top = STRIP_Y - 32;
  let spring = `M${GATE} ${top}`;
  for (let i = 1; i <= 5; i++) spring += `L${GATE + (i % 2 ? 5 : -5)} ${n(top - i * 2.4)}`;
  spring += `L${GATE} ${top - 14}`;

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
        className={FRAME}
      />
      <Screw x={GATE - 37} y={top + 5} angle={30} />
      <Screw x={GATE + 37} y={top + 5} angle={-20} />
      <Screw x={GATE - 37} y={top + 59} angle={70} />
      <Screw x={GATE + 37} y={top + 59} angle={10} />
      <path d={spring} className={INK} />
      <path d={`M${GATE - 20.5} ${top - 19.5}h41v6h-41z`} className={PART} />
      <Screw x={GATE - 15} y={top - 16.5} r={1.8} angle={0} />
      <Screw x={GATE + 15} y={top - 16.5} r={1.8} angle={60} />
      <path d={`M${GATE - 2} ${top - 20}V4M${GATE + 2} ${top - 20}V4`} className={INK} />
      <path d={`M${GATE - 4.5} -1.5h9v6h-9z`} className="fill-lp-ink-2" />
    </svg>
  );
}
