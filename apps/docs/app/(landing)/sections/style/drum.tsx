import { memo } from 'react';
import { DITHER_MASKS } from '../../lib/bayer';
import { THEMES } from './data';
import type { InkTable } from './presets';

/** degrees between two faces */
const ANGLE = 360 / THEMES.length;
/** the distance from the axle to a face, in faces */
const APOTHEM = 0.5 / Math.tan(Math.PI / THEMES.length);

/**
 * The shade of a face turned `deg` from the viewer (down is positive), lit from above: 0 to 16.
 * The face at the front is clean, its neighbours are screened, the faces beyond are in shadow.
 */
export function shade(deg: number): number {
  const a = Math.abs(((((deg + 8 + 180) % 360) + 360) % 360) - 180);
  if (a < 10) return 0;
  // a hard terminator: past 50° a face is in the shadow
  if (a >= 50) return 16;
  return Math.round(((a - 10) / 40) * 10);
}

/**
 * The 12 presets on a drum, like the reel of a flap display: a solid prism of 12 faces, each
 * printed with a preset's name in its own colours, flat toned with the Bayer dither and edged
 * with hairlines. `--face` sets the height of a face; it is drawn turned to `turn`, the engine
 * turns it from there and shades the faces.
 */
export const Drum = memo(function Drum({ table, turn = 0 }: { table: InkTable; turn?: number }) {
  const bg = table.tokens.indexOf('background');
  const primary = table.tokens.indexOf('primary');
  const faces = [];
  for (let i = 0; i < THEMES.length; i++) {
    const theme = THEMES[i];
    const ink = table.inks[theme];
    const level = shade((i - turn) * ANGLE);
    // shadcn maps to your own variables, this page's palette stands in for them
    const own = theme === 'shadcn';
    const face = (mode: 'light' | 'dark', className: string) => (
      <span
        className={`absolute inset-0 items-center justify-center ${className}`}
        style={{
          background: own ? 'var(--color-fd-background)' : ink[mode][bg],
          color: own ? 'var(--color-fd-primary)' : ink[mode][primary],
        }}
      >
        {theme}
      </span>
    );
    faces.push(
      <div
        key={theme}
        data-face={theme}
        className="absolute inset-x-0 top-1/2 -mt-[calc(var(--face)/2)] h-(--face) border border-lp-ink font-pixel text-[calc(var(--face)*0.7)] leading-none [backface-visibility:hidden]"
        style={{
          transform: `rotateX(${-i * ANGLE}deg) translateZ(calc(var(--face) * ${APOTHEM.toFixed(4)}))`,
        }}
      >
        {face('light', 'flex dark:hidden')}
        {face('dark', 'hidden dark:flex')}
        <span
          data-shade
          data-level={level}
          hidden={level === 0}
          className="absolute inset-0 bg-lp-ink dark:bg-lp-paper"
          style={{ maskImage: DITHER_MASKS[level], maskSize: '8px 8px' }}
        />
      </div>,
    );
  }

  return (
    <div aria-hidden className="relative h-[calc(var(--face)*3.732)] [perspective:900px]">
      <div
        data-drum
        className="absolute inset-0 [transform-style:preserve-3d]"
        style={{
          transform: `translateZ(calc(var(--face) * ${(-APOTHEM).toFixed(4)})) rotateX(${turn * ANGLE}deg)`,
        }}
      >
        {faces}
      </div>
    </div>
  );
});

/** the drum turned to `turn`, a fractional theme index: its transform and the faces' shades */
export function turnDrum(drum: HTMLElement, turn: number, face: number) {
  drum.style.transform = `translateZ(${(-APOTHEM * face).toFixed(2)}px) rotateX(${(turn * ANGLE).toFixed(3)}deg)`;
  const faces = drum.children;
  for (let i = 0; i < faces.length; i++) {
    const level = shade((i - turn) * ANGLE);
    const element = faces[i].lastElementChild as HTMLElement;
    if (element.dataset.level === String(level)) continue;
    element.dataset.level = String(level);
    // `hidden`, not `visibility`: a visible child would show through the column when it's hidden
    element.hidden = level === 0;
    element.style.maskImage = DITHER_MASKS[level];
    element.style.maskSize = '8px 8px';
  }
}
