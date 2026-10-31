import type { ComponentProps } from 'react';
import { BED } from './scene';

const PART = 'fill-lp-paper stroke-lp-ink-2';

/** a drag chain's link plates between its rails, a seam and a pin each 9px, a cable clip every 4 */
const LINKS =
  'border-y border-lp-ink-2 bg-[repeating-linear-gradient(to_right,var(--lp-ink-2)_0_2px,transparent_2px_36px),repeating-linear-gradient(to_right,var(--lp-ink-2)_0_1px,transparent_1px_9px),radial-gradient(circle_at_5px_50%,var(--lp-ink-2)_0_1.25px,transparent_1.75px)] bg-size-[36px_100%,9px_100%,9px_100%]';

/** a bracket every sixth of the band: one under the plates' seam, two under each plate */
const BRACKETS = [1, 2, 3, 4, 5];

/** an end stop's hazard stripes */
const STRIPES =
  'border border-lp-ink-2 bg-[repeating-linear-gradient(-45deg,var(--lp-ink-2)_0_2px,var(--lp-paper)_2px_4px)]';

function Bolt({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x - 3} ${y}l1.5 -2.6h3l1.5 2.6l-1.5 2.6h-3z`}
      className={PART}
      strokeLinejoin="round"
    />
  );
}

function Bracket({ at }: { at: number }) {
  return (
    <svg
      viewBox="0 0 30 46"
      shapeRendering="crispEdges"
      className="absolute top-12.5 h-11.5 w-7.5"
      style={{ left: `calc(${(at * 100) / 6}% - 15px)` }}
    >
      <path d="M8.5 9V37.5H0.5V45.5H29.5V37.5H21.5V9" className={PART} />
      <Bolt x={15} y={24} />
      <Bolt x={15} y={5} />
    </svg>
  );
}

/** a detent the carriage stops on */
function Station({ className, ...props }: ComponentProps<'svg'>) {
  return (
    <svg
      viewBox="0 0 20 9"
      className={`absolute top-7.75 h-2.25 w-5 ${className ?? ''}`}
      {...props}
    >
      <path d="M0.5 0.5H19.5V8.5H12.5L10 6L7.5 8.5H0.5Z" className={PART} />
      <circle cx="4.5" cy="4" r="1.25" className="fill-lp-ink-2" />
      <circle cx="15.5" cy="4" r="1.25" className="fill-lp-ink-2" />
    </svg>
  );
}

/** the rail band at the bed's foot; the engine sets its detents, home's and a plate's each of
 * `stops`, and moves the drag chain's bend and pulled run */
export function RailBed({ stops }: { stops: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* the extrusion, its two T-slots */}
      <span className="absolute top-8.75 right-0 left-2 h-6.25 border border-lp-ink-2 bg-lp-paper before:absolute before:inset-x-0 before:top-1 before:h-px before:bg-lp-line-strong/40 after:absolute after:inset-x-0 after:bottom-1 after:h-px after:bg-lp-line-strong/40" />
      {BRACKETS.map((at) => (
        <Bracket key={at} at={at} />
      ))}
      {/* the rack, the rail and its groove */}
      <span className="absolute top-10 right-0 left-6.25 h-1 bg-[repeating-linear-gradient(to_right,var(--lp-ink-2)_0_1px,transparent_1px_3px)]" />
      <span className="absolute top-11 right-0 left-6.25 h-2 bg-[linear-gradient(to_bottom,var(--lp-ink-2)_3px,var(--lp-paper)_3px_5px,var(--lp-ink-2)_5px)]" />
      {Array.from({ length: stops + 1 }, (_, i) => (
        <Station key={i} data-station className="invisible" />
      ))}
      {/* the limit switch it trips at home, and the end stop behind it */}
      <svg className="absolute top-7 left-7 h-3.5 w-4.5" viewBox="0 0 18 14">
        <rect x="0.5" y="0.5" width="10" height="8" className={PART} />
        <path d="M10.5 4.5L15.5 10.5" className="stroke-lp-ink-2" />
        <circle cx="15.5" cy="10.5" r="2.2" className={PART} />
      </svg>
      <span className={`absolute top-8.25 left-3 h-7.5 w-3 ${STRIPES}`} />
      {/* the drag chain: from the bend on, its fixed run and the run the carriage pulls, its
       links riding with the carriage; the bend between them */}
      <span
        data-chain="runs"
        className="absolute inset-y-0 left-0 overflow-clip *:absolute *:left-0 *:h-2 *:w-full"
        style={{ right: BED.anchor, transform: `translateX(${BED.start}px)` }}
      >
        <span
          data-chain="fixed"
          className={`top-2.5 ${LINKS}`}
          style={{ transform: `translateX(-${BED.start}px)` }}
        />
        <span
          data-chain="pulled"
          className={`top-5.5 bg-right ${LINKS}`}
          style={{ transform: 'translateX(-100%)' }}
        />
      </span>
      <svg
        data-chain="bend"
        viewBox={`0 0 ${BED.bend} 20`}
        className="absolute top-2.5 left-0 h-5 overflow-visible"
        style={{ width: BED.bend, transform: `translateX(${BED.start - BED.bend}px)` }}
      >
        <path d="M11 0.5A9.5 9.5 0 0 0 11 19.5V12.5A2.5 2.5 0 0 1 11 7.5Z" className={PART} />
        <path d="M8 10H2M8.9 7.9L4.6 3.6M8.9 12.1L4.6 16.4" className="stroke-lp-ink-2" />
      </svg>
      {/* its anchor, and the cable out through the frame */}
      <span
        className="absolute top-3.25 h-0.5 bg-lp-ink-2"
        style={{ right: 0, width: BED.anchor - 5 }}
      />
      <svg
        className="absolute top-1 h-5.5 w-4.5"
        style={{ right: BED.anchor - 9 }}
        viewBox="0 0 18 22"
      >
        <rect x="0.5" y="0.5" width="17" height="21" className={PART} />
        <Bolt x={9} y={6} />
        <Bolt x={9} y={16} />
      </svg>
    </div>
  );
}

/** the rail down the middle of a phone's column, bracketed to the window's frame on its left; `id`
 * names its figure, for the page's one bracket pattern by that name */
export function RailColumn({ id }: { id: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="absolute top-6 left-0 h-[calc(100%-48px)] w-6.5" shapeRendering="crispEdges">
        <defs>
          <pattern id={`${id}-bracket-y`} width="26" height="96" patternUnits="userSpaceOnUse">
            <path d="M27 42.5H6.5V36.5H0.5V59.5H6.5V53.5H27" className={PART} />
            <Bolt x={3.5} y={48} />
            <Bolt x={16} y={48} />
          </pattern>
        </defs>
        <rect width="26" height="100%" fill={`url(#${id}-bracket-y)`} />
      </svg>
      <span className="absolute inset-y-1.5 left-6.5 w-5 border border-lp-ink-2 bg-lp-paper" />
      <span className="absolute inset-y-3 left-7.5 w-0.75 bg-[repeating-linear-gradient(to_bottom,var(--lp-ink-2)_0_1px,transparent_1px_3px)]" />
      <span className="absolute inset-y-3 left-8.25 w-1.5 bg-[linear-gradient(to_right,var(--lp-ink-2)_2px,var(--lp-paper)_2px_4px,var(--lp-ink-2)_4px)]" />
      <span className={`absolute top-0.5 left-7 h-2 w-4 -scale-x-100 ${STRIPES}`} />
      <span className={`absolute bottom-0.5 left-7 h-2 w-4 ${STRIPES}`} />
    </div>
  );
}
