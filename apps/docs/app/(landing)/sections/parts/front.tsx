import { DITHER_MASKS } from '../../lib/dither';
import { Chip, type Layer } from '../../ui/chip';
import { Roller } from '../../ui/text';
import { cn } from '@/lib/cn';

/**
 * A layer's front at its own size, which the camera lays on its face: its name stencilled, the
 * module on a nameplate that rolls when it changes and lights up while the tray is out, and a latch
 * or the core's bolts, in the mid-grey ink so the nameplate stays the strongest mark.
 */
export function Front({ layer, title, name }: { layer: Layer; title: string; name: string }) {
  return (
    <div
      data-front={layer}
      className="parts-front group/tray invisible absolute top-0 left-0 flex h-[64px] w-[420px] origin-top-left items-center gap-3 bg-lp-paper px-7 text-lp-ink min-[768px]:h-[72px] min-[768px]:w-[1069px] md:gap-6 md:px-12"
    >
      <Screw angle={35} className="top-1/2 left-3.5 md:left-6" />
      <Screw angle={-50} className="top-1/2 right-3.5 translate-x-1/2 md:right-6" />
      <Chip
        layer={layer}
        className="h-10 w-[180px] shrink-0 gap-3 border-0 bg-transparent px-0 text-[26px] max-md:hidden [&_svg]:size-[18px]"
      />
      <span className="relative flex h-[52px] min-w-0 flex-1 md:max-w-[520px]">
        {/* the stamp's second strike, a hair off its line */}
        <span
          aria-hidden
          className="absolute inset-0 translate-[3px] border-[1.5px] border-lp-ink-2"
        />
        <span className="relative flex min-w-0 flex-1 flex-col justify-center border-[1.5px] border-lp-ink bg-lp-paper-2 px-7 group-data-open/tray:bg-lp-yellow group-data-open/tray:text-[#121210] md:px-8">
          <span className="font-pixel text-[22px] leading-none md:text-[26px]">
            <Roller value={title} />
          </span>
          <span className="mt-1.5 truncate font-mono text-[15px] leading-none text-lp-ink-2 group-data-open/tray:text-[#121210] max-md:hidden">
            {name}
          </span>
          <Chip
            layer={layer}
            className="mt-1.5 h-auto gap-1.5 border-0 bg-transparent px-0 text-[15px] text-lp-ink-2 group-data-open/tray:text-[#121210] md:hidden [&_svg]:size-3"
          />
          <span
            aria-hidden
            className="absolute inset-y-1.5 right-1.5 flex flex-col items-center justify-between"
          >
            <Rivet />
            <Rivet />
          </span>
        </span>
      </span>
      {layer === 'core' ? (
        // bolted in, never swapped
        <span aria-hidden className="relative ms-auto flex h-full w-[60px] shrink-0 md:w-[104px]">
          <span className="absolute inset-x-0 inset-y-2 border-[1.5px] border-lp-ink-2 bg-[repeating-linear-gradient(-45deg,var(--lp-ink-2)_0_5px,transparent_5px_11px)]" />
          <Bolt angle={15} className="top-1/2 left-[25%]" />
          <Bolt angle={-20} className="top-1/2 left-[75%]" />
        </span>
      ) : (
        // a slide bolt shot into a keeper: `data-open` draws it back before the tray slides out
        <span
          aria-hidden
          className="relative ms-auto block h-10 w-[104px] shrink-0 max-md:w-[60px]"
        >
          {/* the bolt's guide, screwed to the tray, and the keeper on the case beside it */}
          <span className="absolute inset-y-2 left-0 w-[58%] border-[1.5px] border-lp-ink-2 bg-lp-paper" />
          <span className="absolute inset-y-1.5 right-0 w-5 border-[1.5px] border-lp-ink bg-lp-paper-2" />
          <span className="absolute inset-0 transition-transform duration-[125ms] ease-[steps(2,end)] group-data-open/tray:-translate-x-[34%] motion-reduce:transition-none">
            <span className="absolute top-1/2 right-1.5 left-2 h-2.5 -translate-y-1/2 border-[1.5px] border-lp-ink bg-lp-paper-2" />
            {/* its knob, the handle a hand pulls */}
            <span className="absolute top-1/2 left-[46%] h-7 w-3.5 -translate-y-1/2 border-[1.5px] border-lp-ink bg-lp-sun" />
          </span>
        </span>
      )}
    </div>
  );
}

/** a slotted screw head */
function Screw({ angle, className }: { angle: number; className: string }) {
  return (
    <svg
      aria-hidden
      viewBox="-8 -8 16 16"
      className={cn('absolute size-4 -translate-1/2 overflow-visible', className)}
    >
      <circle r="6.5" strokeWidth={1.5} className="fill-lp-paper stroke-lp-ink-2" />
      <path
        d="M-4 0H4"
        strokeWidth={1.5}
        transform={`rotate(${angle})`}
        className="stroke-lp-ink-2"
      />
    </svg>
  );
}

/** a hex bolt head with its washer */
function Bolt({ angle, className }: { angle: number; className: string }) {
  return (
    <svg
      aria-hidden
      viewBox="-12 -12 24 24"
      className={cn('absolute size-6 -translate-1/2 overflow-visible', className)}
    >
      <circle r="10.5" strokeWidth={1.5} className="fill-lp-paper stroke-lp-ink-2" />
      <path
        d="M7 0L3.5 6.06H-3.5L-7 0L-3.5-6.06H3.5Z"
        strokeWidth={1.5}
        transform={`rotate(${angle})`}
        className="fill-lp-paper-2 stroke-lp-ink-2"
      />
      <circle r="2" className="fill-lp-ink-2" />
    </svg>
  );
}

/** a domed rivet, its right half in a dither */
function Rivet() {
  return (
    <span className="relative size-2.5 overflow-hidden rounded-full border-[1.5px] border-lp-ink-2 bg-lp-paper">
      <span
        className="pointer-events-none absolute inset-0 left-1/2 bg-lp-ink"
        style={{ maskImage: DITHER_MASKS[6], maskSize: '6px 6px' }}
      />
    </span>
  );
}
