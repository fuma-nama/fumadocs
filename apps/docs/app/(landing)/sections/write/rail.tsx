import type { ComponentProps } from 'react';
import { BED } from './arm';

const PART = 'fill-lp-paper stroke-lp-ink-2';

/** a drag chain's link plates between its rails, a seam and a pin each 7px, a cable clip every 4 */
const LINKS =
  'border-y border-lp-ink-2 bg-[repeating-linear-gradient(to_right,var(--lp-ink-2)_0_2px,transparent_2px_28px),repeating-linear-gradient(to_right,var(--lp-ink-2)_0_1px,transparent_1px_7px),radial-gradient(circle_at_4px_50%,var(--lp-ink-2)_0_1px,transparent_1.5px)] bg-size-[28px_100%,7px_100%,7px_100%]';

/** the band is the bed's width: a bracket at every twelfth of it, so one stands under each plate's
 * seam and two in each plate; in the 2x2 bed, every other one */
const BRACKETS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/** where the carriage stops for each plate, about: by the seam before or after it, on the 4-plate
 * bed and the 2x2 one, the boom's pivot off the line her pencil runs down. The engine sets each to
 * the stop it computes */
const STOPS = [
  'md:left-[calc(50%-14px)] xl:left-[calc(25%-16px)]',
  'md:left-[calc(50%-23px)] xl:left-[calc(25%-27px)]',
  'md:left-[calc(50%-66px)] xl:left-[calc(50%-27px)]',
  'md:left-[calc(50%-15px)] xl:left-[calc(75%-27px)]',
];

/** a hex bolt head, its centre at (x, y) */
function Bolt({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x - 3} ${y}l1.5 -2.6h3l1.5 2.6l-1.5 2.6h-3z`}
      className={PART}
      strokeLinejoin="round"
    />
  );
}

/** a bracket from the extrusion down to the frame, a bolt into its T-slot and one through its foot */
function Bracket({ at }: { at: number }) {
  return (
    <svg
      viewBox="0 0 24 36"
      shapeRendering="crispEdges"
      className={`absolute top-[40px] h-[36px] w-[24px] ${at % 2 === 1 ? 'md:max-xl:hidden' : ''}`}
      style={{ left: `calc(${(at * 100) / 12}% - 12px)` }}
    >
      <path d="M6.5 7V29.5H0.5V35.5H23.5V29.5H17.5V7" className={PART} />
      <Bolt x={12} y={19} />
      <Bolt x={12} y={4} />
    </svg>
  );
}

/** a detent the carriage stops on, its notch toward the rail, bolted to the extrusion */
function Station({ className, ...props }: ComponentProps<'svg'>) {
  return (
    <svg
      viewBox="0 0 16 7"
      className={`absolute top-[25px] h-[7px] w-[16px] ${className ?? ''}`}
      {...props}
    >
      <path d="M0.5 0.5H15.5V6.5H10L8 4.5L6 6.5H0.5Z" className={PART} />
      <circle cx="3.5" cy="3" r="1" className="fill-lp-ink-2" />
      <circle cx="12.5" cy="3" r="1" className="fill-lp-ink-2" />
    </svg>
  );
}

/** a limit switch the carriage trips at an end of its travel: its body, lever and roller */
function LimitSwitch({ className }: { className: string }) {
  return (
    <svg className={`absolute top-[22px] h-[11px] w-[14px] ${className}`} viewBox="0 0 14 11">
      <rect x="0.5" y="0.5" width="8" height="6" className={PART} />
      <path d="M8.5 3.5L12.5 8.5" className="stroke-lp-ink-2" />
      <circle cx="12.5" cy="8.5" r="1.8" className={PART} />
    </svg>
  );
}

/**
 * The rail band at the bed's foot, drawn on the server: an extrusion bolted to the frame by
 * brackets, the rail and its rack between end stops, and the drag chain the carriage pulls, its
 * fixed run anchored near the right end. The engine moves the chain's bend and pulled run.
 */
export function RailBed() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* the extrusion, its two T-slots */}
      <span className="absolute top-[28px] right-0 left-[6px] h-[20px] border border-lp-ink-2 bg-lp-paper before:absolute before:inset-x-0 before:top-[3px] before:h-px before:bg-lp-line-strong/40 after:absolute after:inset-x-0 after:bottom-[3px] after:h-px after:bg-lp-line-strong/40" />
      {BRACKETS.map((at) => (
        <Bracket key={at} at={at} />
      ))}
      {/* the rack, the rail and its groove */}
      <span className="absolute top-[32px] right-0 left-[20px] h-[3px] bg-[repeating-linear-gradient(to_right,var(--lp-ink-2)_0_1px,transparent_1px_3px)]" />
      <span className="absolute top-[35px] right-0 left-[20px] h-[6px] bg-[linear-gradient(to_bottom,var(--lp-ink-2)_2px,var(--lp-paper)_2px_4px,var(--lp-ink-2)_4px)]" />
      {/* the stations it stops on: home, where it parks, and one for each plate; its travel ends at
          the last, against the frame */}
      <Station style={{ left: BED.start - 8 }} />
      {STOPS.map((at) => (
        <Station key={at} data-station className={at} />
      ))}
      {/* the limit switch it trips at home, and the end stop behind it, a hazard face toward it */}
      <LimitSwitch className="left-[22px]" />
      <span className="absolute top-[26px] left-[10px] h-[24px] w-[10px] border border-lp-ink-2 bg-[repeating-linear-gradient(-45deg,var(--lp-ink-2)_0_2px,var(--lp-paper)_2px_4px)]" />
      {/* the drag chain: the fixed run, the run the carriage pulls, the bend between them */}
      <span
        data-chain="fixed"
        className={`absolute top-[8px] left-0 h-[6px] ${LINKS}`}
        style={{ right: BED.anchor, clipPath: `inset(0 0 0 ${BED.start}px)` }}
      />
      <span
        data-chain="pulled"
        className={`absolute top-[18px] left-0 h-[6px] ${LINKS}`}
        style={{
          right: BED.anchor,
          clipPath: `inset(0 calc(100% - ${BED.start}px) 0 ${BED.start}px)`,
          backgroundPositionX: BED.start,
        }}
      />
      <svg
        data-chain="bend"
        viewBox="0 0 9 16"
        className="absolute top-[8px] left-0 h-[16px] w-[9px] overflow-visible"
        style={{ transform: `translateX(${BED.start - 9}px)` }}
      >
        <path d="M9 0.5A7.5 7.5 0 0 0 9 15.5V10.5A2.5 2.5 0 0 1 9 5.5Z" className={PART} />
        <path d="M6.5 8H1.5M7.2 6.2L3.7 2.7M7.2 9.8L3.7 13.3" className="stroke-lp-ink-2" />
      </svg>
      {/* its anchor bolted to the bed, and the cable out through the frame */}
      <span
        className="absolute top-[10px] h-[2px] bg-lp-ink-2"
        style={{ right: 0, width: BED.anchor - 4 }}
      />
      <svg
        className="absolute top-[3px] h-[18px] w-[14px]"
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

/** the rail up a phone's column, down its middle, bolted to the window's frame by brackets to its
 * left */
export function RailColumn() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        className="absolute top-[24px] left-0 h-[calc(100%-48px)] w-[26px]"
        shapeRendering="crispEdges"
      >
        <defs>
          <pattern id="write-bracket-y" width="26" height="96" patternUnits="userSpaceOnUse">
            <path d="M27 42.5H6.5V36.5H0.5V59.5H6.5V53.5H27" className={PART} />
            <Bolt x={3.5} y={48} />
            <Bolt x={16} y={48} />
          </pattern>
        </defs>
        <rect width="26" height="100%" fill="url(#write-bracket-y)" />
      </svg>
      <span className="absolute inset-y-[6px] left-[26px] w-[20px] border border-lp-ink-2 bg-lp-paper" />
      <span className="absolute inset-y-[12px] left-[30px] w-[3px] bg-[repeating-linear-gradient(to_bottom,var(--lp-ink-2)_0_1px,transparent_1px_3px)]" />
      <span className="absolute inset-y-[12px] left-[33px] w-[6px] bg-[linear-gradient(to_right,var(--lp-ink-2)_2px,var(--lp-paper)_2px_4px,var(--lp-ink-2)_4px)]" />
      <span className="absolute top-[2px] left-[28px] h-[8px] w-[16px] border border-lp-ink-2 bg-[repeating-linear-gradient(45deg,var(--lp-ink-2)_0_2px,var(--lp-paper)_2px_4px)]" />
      <span className="absolute bottom-[2px] left-[28px] h-[8px] w-[16px] border border-lp-ink-2 bg-[repeating-linear-gradient(-45deg,var(--lp-ink-2)_0_2px,var(--lp-paper)_2px_4px)]" />
    </div>
  );
}
