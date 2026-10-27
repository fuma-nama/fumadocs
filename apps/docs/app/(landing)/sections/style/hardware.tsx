import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { DITHER_MASKS } from '../../lib/dither';
import type { LayoutId } from './data';
import { Hazard, PART, type PartProps, Screw, Stamp } from './parts';
import { HUB, hubPort, percent, SLOTS, WINDOW, windowPort } from './scene';

/** a dither of ink over the box, `level` of 16 cells */
function Dither({ level, className }: { level: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 bg-lp-ink', className)}
      style={{ maskImage: DITHER_MASKS[level], maskSize: '4px 4px' }}
    />
  );
}

function Jack({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <span
      aria-hidden
      className="absolute z-[1] grid size-[max(8px,1.7cqw)] -translate-1/2 place-items-center rounded-full border border-lp-ink-2 bg-lp-paper"
      style={{ left: `${(x / w) * 100}%`, top: `${(y / h) * 100}%` }}
    >
      <span className="size-[38%] rounded-full bg-lp-ink-2" />
    </span>
  );
}

function Tape({ className, style }: PartProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute h-[max(6px,1.8cqw)] w-[max(20px,6.5cqw)] border-y border-lp-ink-2 bg-lp-paper [clip-path:polygon(0_0,100%_0,94%_25%,100%_50%,95%_75%,100%_100%,0_100%,5%_70%,0_45%,6%_20%)]',
        className,
      )}
      style={style}
    >
      <Dither level={2} />
    </span>
  );
}

function Fuse({ style }: { style: CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 96 24" className={PART} style={style}>
      <path d="M10 22V6a4 4 0 0 1 8 0v16M78 22V6a4 4 0 0 1 8 0v16" className="fill-none" />
      <rect x={4.5} y={5.5} width={87} height={13} rx={2} />
      <rect x={4.5} y={5.5} width={12} height={13} className="fill-lp-ink-2 stroke-none" />
      <rect x={79.5} y={5.5} width={12} height={13} className="fill-lp-ink-2 stroke-none" />
      <path d="M17 12h8l3-3 4 6 4-6 4 6 4-6 4 6 4-6 4 6 3-3h17" className="fill-none" />
    </svg>
  );
}

function Transformer({ style }: { style: CSSProperties }) {
  let lamination = '';
  for (let y = 12; y <= 52; y += 4) lamination += `M14 ${y}h68`;
  let winding = '';
  for (let x = 22; x <= 38; x += 2) winding += `M${x} 18v28`;
  for (let x = 58; x <= 74; x += 2) winding += `M${x} 18v28`;
  return (
    <svg aria-hidden viewBox="0 0 96 70" className={PART} style={style}>
      <path d="M2.5 60.5h91v8h-91z" />
      <circle cx={9} cy={64.5} r={2} />
      <circle cx={87} cy={64.5} r={2} />
      <rect x={12.5} y={8.5} width={71} height={52} />
      <path d={lamination} className="stroke-lp-line-strong" />
      <rect x={19.5} y={16.5} width={22} height={32} />
      <rect x={55.5} y={16.5} width={22} height={32} />
      <path d={winding} />
      <path d="M26 8.5V2M34 8.5V2M62 8.5V2M70 8.5V2" />
    </svg>
  );
}

function Trimmer({ style }: { style: CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 30 34" className={PART} style={style}>
      <path d="M7 27v6M15 27v6M23 27v6" />
      <rect x={0.5} y={0.5} width={29} height={27} />
      <circle cx={15} cy={14} r={8.5} />
      <path d="M10 9l10 10" strokeWidth={2} />
    </svg>
  );
}

function Crystal({ style }: { style: CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 44 22" className={PART} style={style}>
      <path d="M14 16v6M30 16v6" />
      <rect x={0.5} y={0.5} width={43} height={15} rx={7.5} />
      <rect
        x={5.5}
        y={4.5}
        width={33}
        height={7}
        rx={3.5}
        className="fill-none stroke-lp-line-strong"
      />
    </svg>
  );
}

function SafetyPin({ style }: { style: CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 48 12" className={PART} style={style}>
      <path d="M8 3.5H40M8 8.5H38" />
      <circle cx={6} cy={6} r={3.5} className="fill-none" />
      <path d="M38 2.5h6.5a2.5 2.5 0 0 1 0 7H38z" />
    </svg>
  );
}

/** a plate around a window, `--plate` wider on each side */
function Plate({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute -inset-(--plate) -z-10 border border-lp-line-strong bg-lp-paper [--rim:calc(var(--plate)*0.5)]',
        className,
      )}
    >
      {children}
    </span>
  );
}

const EDGES = {
  top: 'top-[var(--rim)]',
  bottom: 'top-[calc(100%-var(--rim))]',
  right: 'left-[calc(100%-var(--rim))]',
};

interface RivetsProps {
  edge: keyof typeof EDGES;
  from: number;
  to: number;
  count: number;
}

function Rivets({ edge, from, to, count }: RivetsProps) {
  const rivets = [];
  for (let i = 0; i < count; i++) {
    const offset = `${from + ((to - from) * i) / (count - 1)}%`;
    rivets.push(
      <span
        key={i}
        aria-hidden
        className={cn(
          'absolute size-[max(5px,1cqw)] -translate-1/2 overflow-hidden rounded-full border border-lp-ink-2 bg-lp-paper',
          EDGES[edge],
        )}
        style={edge === 'right' ? { top: offset } : { left: offset }}
      >
        <Dither level={6} className="left-1/2" />
      </span>,
    );
  }
  return rivets;
}

/** the scrap each window is bolted to, none alike */
const CHASSIS: Record<LayoutId, ReactNode> = {
  docs: (
    <Plate>
      <Screw angle={20} className="top-[var(--rim)] left-[var(--rim)]" />
      <Screw angle={-35} className="top-[var(--rim)] right-[var(--rim)] translate-x-1/2" />
      <Screw angle={70} className="bottom-[var(--rim)] left-[var(--rim)] translate-y-1/2" />
      <Screw angle={5} className="right-[var(--rim)] bottom-[var(--rim)] translate-1/2" />
      <Rivets edge="bottom" from={14} to={86} count={7} />
    </Plate>
  ),
  notebook: (
    <Plate className="bg-[repeating-linear-gradient(-45deg,var(--lp-line)_0_1px,transparent_1px_5px)]">
      <Rivets edge="top" from={12} to={88} count={5} />
    </Plate>
  ),
  flux: (
    <Plate className="bg-[radial-gradient(var(--lp-line-strong)_0.6px,transparent_0.6px)] bg-size-[5px_5px]">
      <Screw angle={-60} className="top-[var(--rim)] left-[var(--rim)]" />
      <Screw angle={45} className="right-[var(--rim)] bottom-[var(--rim)] translate-1/2" />
      <Rivets edge="right" from={18} to={82} count={4} />
    </Plate>
  ),
  glass: (
    <>
      <Tape className="-top-[2%] -left-[5%]" style={{ rotate: '-32deg' }} />
      <Tape className="-top-[2%] -right-[5%]" style={{ rotate: '28deg' }} />
    </>
  ),
  spacious: (
    <Plate className="outline outline-1 outline-offset-[calc(var(--plate)*-0.45)] outline-lp-ink-2">
      <Screw angle={80} className="top-[var(--rim)] left-[var(--rim)]" />
      <Screw angle={10} className="top-[var(--rim)] right-[var(--rim)] translate-x-1/2" />
      <Screw angle={-25} className="bottom-[var(--rim)] left-[var(--rim)] translate-y-1/2" />
      <Screw angle={55} className="right-[var(--rim)] bottom-[var(--rim)] translate-1/2" />
    </Plate>
  ),
  home: (
    <Plate>
      <Hazard className="inset-x-[12%] -bottom-px h-[var(--plate)] border-x border-lp-ink-2" />
      <Rivets edge="top" from={8} to={92} count={9} />
    </Plate>
  ),
};

/** the desk's fixed hardware, drawn on the server */
export function createHardware() {
  const plates = {} as Record<LayoutId, ReactNode>;
  const jacks = [];
  for (const slot of SLOTS) {
    const [x, y] = windowPort(slot);
    plates[slot.id] = (
      <>
        {CHASSIS[slot.id]}
        <Jack x={x} y={y} w={WINDOW.w} h={WINDOW.h} />
      </>
    );
    const [hx, hy] = hubPort(slot);
    jacks.push(<Jack key={slot.id} x={hx} y={hy} w={HUB.w} h={HUB.h} />);
  }

  return {
    plates,
    junction: (
      <>
        <Hazard className="inset-x-0 top-0 h-[16%] border-b border-lp-ink" />
        <Screw angle={30} className="top-[30%] left-[7%]" />
        <Screw angle={-40} className="top-[30%] right-[7%] translate-x-1/2" />
        <Screw angle={75} className="bottom-[12%] left-[7%]" />
        <Screw angle={-10} className="right-[7%] bottom-[12%] translate-x-1/2" />
        <span className="absolute inset-x-0 top-[16%] bottom-0 flex items-center justify-center">
          <Stamp tilt={-2} className="text-[max(9px,1.2cqw)]">
            search
          </Stamp>
        </span>
        {/* a speaker grille: holes punched in a plate */}
        <span
          aria-hidden
          className="absolute right-[14%] bottom-[12%] h-[24%] w-[18%] rounded-[3px] border border-lp-ink-2 bg-[radial-gradient(var(--lp-ink-2)_1px,transparent_1.4px)] bg-size-[5px_5px] bg-center"
        />
        {jacks}
      </>
    ),
    // in the two bands beside the box that no window, shadow or cable reaches in any frame of a
    // move, under the windows and the cables; a small desk keeps the fewest
    bench: (
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <SafetyPin style={{ ...percent(14, 406, 60, 15), rotate: '-16deg' }} />
        <Trimmer style={percent(792, 344, 30, 34)} />
        <Crystal style={percent(830, 352, 44, 22)} />
        <Transformer style={percent(890, 344, 82, 60)} />
        <Fuse style={percent(792, 388, 84, 21)} />
      </div>
    ),
  };
}

export type Hardware = ReturnType<typeof createHardware>;
