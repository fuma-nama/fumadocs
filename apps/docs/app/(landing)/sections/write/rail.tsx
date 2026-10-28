import type { ComponentProps } from 'react';
import { BED } from './scene';

const PART = 'fill-lp-paper stroke-lp-ink-2';

/** a drag chain's link plates between its rails, a seam and a pin each 7px, a cable clip every 4 */
const LINKS =
  'border-y border-lp-ink-2 bg-[repeating-linear-gradient(to_right,var(--lp-ink-2)_0_2px,transparent_2px_28px),repeating-linear-gradient(to_right,var(--lp-ink-2)_0_1px,transparent_1px_7px),radial-gradient(circle_at_4px_50%,var(--lp-ink-2)_0_1px,transparent_1.5px)] bg-size-[28px_100%,7px_100%,7px_100%]';

/** a bracket every twelfth of the band: one under each plate's seam, two in each plate */
const BRACKETS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

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
      viewBox="0 0 24 36"
      shapeRendering="crispEdges"
      className={`absolute top-10 h-9 w-6 ${at % 2 === 1 ? 'md:max-xl:hidden' : ''}`}
      style={{ left: `calc(${(at * 100) / 12}% - 12px)` }}
    >
      <path d="M6.5 7V29.5H0.5V35.5H23.5V29.5H17.5V7" className={PART} />
      <Bolt x={12} y={19} />
      <Bolt x={12} y={4} />
    </svg>
  );
}

/** a detent the carriage stops on */
function Station({ className, ...props }: ComponentProps<'svg'>) {
  return (
    <svg
      viewBox="0 0 16 7"
      className={`absolute top-6.25 h-1.75 w-4 ${className ?? ''}`}
      {...props}
    >
      <path d="M0.5 0.5H15.5V6.5H10L8 4.5L6 6.5H0.5Z" className={PART} />
      <circle cx="3.5" cy="3" r="1" className="fill-lp-ink-2" />
      <circle cx="12.5" cy="3" r="1" className="fill-lp-ink-2" />
    </svg>
  );
}

/** the rail band at the bed's foot; the engine sets its detents, home's and a plate's each of
 * `stops`, and moves the drag chain's bend and pulled run */
export function RailBed({ stops }: { stops: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* the extrusion, its two T-slots */}
      <span className="absolute top-7 right-0 left-1.5 h-5 border border-lp-ink-2 bg-lp-paper before:absolute before:inset-x-0 before:top-0.75 before:h-px before:bg-lp-line-strong/40 after:absolute after:inset-x-0 after:bottom-0.75 after:h-px after:bg-lp-line-strong/40" />
      {BRACKETS.map((at) => (
        <Bracket key={at} at={at} />
      ))}
      {/* the rack, the rail and its groove */}
      <span className="absolute top-8 right-0 left-5 h-0.75 bg-[repeating-linear-gradient(to_right,var(--lp-ink-2)_0_1px,transparent_1px_3px)]" />
      <span className="absolute top-8.75 right-0 left-5 h-1.5 bg-[linear-gradient(to_bottom,var(--lp-ink-2)_2px,var(--lp-paper)_2px_4px,var(--lp-ink-2)_4px)]" />
      {Array.from({ length: stops + 1 }, (_, i) => (
        <Station key={i} data-station className="invisible" />
      ))}
      {/* the limit switch it trips at home, and the end stop behind it */}
      <svg className="absolute top-5.5 left-5.5 h-2.75 w-3.5" viewBox="0 0 14 11">
        <rect x="0.5" y="0.5" width="8" height="6" className={PART} />
        <path d="M8.5 3.5L12.5 8.5" className="stroke-lp-ink-2" />
        <circle cx="12.5" cy="8.5" r="1.8" className={PART} />
      </svg>
      <span className={`absolute top-6.5 left-2.5 h-6 w-2.5 ${STRIPES}`} />
      {/* the drag chain: from the bend on, its fixed run and the run the carriage pulls, its
       links riding with the carriage; the bend between them */}
      <span
        data-chain="runs"
        className="absolute inset-y-0 left-0 overflow-clip *:absolute *:left-0 *:h-1.5 *:w-full"
        style={{ right: BED.anchor, transform: `translateX(${BED.start}px)` }}
      >
        <span
          data-chain="fixed"
          className={`top-2 ${LINKS}`}
          style={{ transform: `translateX(-${BED.start}px)` }}
        />
        <span
          data-chain="pulled"
          className={`top-4.5 bg-right ${LINKS}`}
          style={{ transform: 'translateX(-100%)' }}
        />
      </span>
      <svg
        data-chain="bend"
        viewBox="0 0 9 16"
        className="absolute top-2 left-0 h-4 w-2.25 overflow-visible"
        style={{ transform: `translateX(${BED.start - 9}px)` }}
      >
        <path d="M9 0.5A7.5 7.5 0 0 0 9 15.5V10.5A2.5 2.5 0 0 1 9 5.5Z" className={PART} />
        <path d="M6.5 8H1.5M7.2 6.2L3.7 2.7M7.2 9.8L3.7 13.3" className="stroke-lp-ink-2" />
      </svg>
      {/* its anchor, and the cable out through the frame */}
      <span
        className="absolute top-2.5 h-0.5 bg-lp-ink-2"
        style={{ right: 0, width: BED.anchor - 4 }}
      />
      <svg
        className="absolute top-0.75 h-4.5 w-3.5"
        style={{ right: BED.anchor - 7 }}
        viewBox="0 0 14 18"
      >
        <rect x="0.5" y="0.5" width="13" height="17" className={PART} />
        <Bolt x={7} y={5} />
        <Bolt x={7} y={13} />
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
