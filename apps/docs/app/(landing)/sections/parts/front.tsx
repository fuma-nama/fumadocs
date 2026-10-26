import { Roller } from '../../ui/roller';
import { Chip, type Layer } from '../../ui/spec';
import { Bolt, Hazard, Latch, Rivets, Screw } from './hardware';

/**
 * A layer's front: its name stencilled on the left, the module on a riveted nameplate that rolls
 * when it changes and lights up while the tray is out, and what holds the tray in: a latch, or the
 * core's bolts. Laid out at its own size (420x64, 1069x72 from 768px); the camera puts it on its face.
 */
export function Front({ layer, title, name }: { layer: Layer; title: string; name: string }) {
  return (
    <div className="relative flex h-full items-center gap-3 px-7 md:gap-6 md:px-12">
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
          <Rivets count={2} className="absolute inset-y-1.5 right-1.5 flex-col" />
        </span>
      </span>
      {layer === 'core' ? (
        // bolted in, never swapped
        <span aria-hidden className="relative ms-auto flex h-full w-[60px] shrink-0 md:w-[104px]">
          <Hazard className="inset-x-0 inset-y-2 border-[1.5px] border-lp-ink-2" />
          <Bolt angle={15} className="top-1/2 left-[25%]" />
          <Bolt angle={-20} className="top-1/2 left-[75%]" />
        </span>
      ) : (
        <Latch className="ms-auto max-md:w-[60px]" />
      )}
    </div>
  );
}
