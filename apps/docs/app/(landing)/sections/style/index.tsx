import type { CSSProperties, ReactNode } from 'react';
import { copy } from '../../content';
import { Figure, FigureHeader } from '../../ui/figure';
import { FIRST, THEMES, type ThemeId } from './data';
import { createHardware } from './hardware';
import { loadInks, wire, type Wiring } from './presets';
import { FIRST_POSE, hangRopes } from './scene';
import { Stage } from './stage';

/**
 * The long title, a line per claim, each after a lamp of the switches' kind. A lamp dithers on as
 * its line comes up the screen, scrubbed by the scroll; without scroll timelines it is lit.
 */
function Title() {
  const lines: ReactNode[] = [];
  for (let i = 0; i < copy.style.title.length; i++) {
    const words: ReactNode[] = [];
    for (const run of copy.style.title[i]) {
      words.push(
        typeof run === 'string' ? (
          run
        ) : (
          <span key={run.term} className="font-pixel font-normal tracking-normal text-lp-orange">
            {run.term}
          </span>
        ),
      );
    }
    lines.push(
      <span key={i} style={{ '--i': i } as CSSProperties} className="relative block ps-[0.95em]">
        {/* clipped, not hidden: a scroll container would be its own lamp's scroller */}
        <span
          aria-hidden
          className="absolute top-[0.5lh] left-0 size-[0.4em] -translate-y-1/2 overflow-clip rounded-full border border-lp-ink bg-lp-paper"
        >
          <span className="absolute inset-0 animate-[lp-dither-in_linear_both] bg-lp-sun [mask-size:4px_4px] [animation-range:cover_calc(22%+var(--i)*6%)_cover_calc(28%+var(--i)*6%)] [animation-timeline:view()] after:absolute after:top-[22%] after:left-[22%] after:size-[0.1em] after:bg-lp-yellow motion-reduce:animate-none" />
        </span>{' '}
        {words}
      </span>,
    );
  }
  return lines;
}

export async function Style() {
  const table = await loadInks();
  const overlay = table.tokens.indexOf('overlay');
  const names = table.tokens.filter((_, i) => i !== overlay);
  const wirings = {} as Record<ThemeId, { light: Wiring; dark: Wiring }>;
  for (const theme of THEMES) {
    const ink = table.inks[theme];
    wirings[theme] = {
      light: wire(ink.light.filter((_, i) => i !== overlay)),
      dark: wire(ink.dark.filter((_, i) => i !== overlay)),
    };
  }
  // the desk's cables in its first pose settle here, once: the browser takes their shape
  const ropes = hangRopes(FIRST_POSE);

  return (
    <Figure id="style" aria-label="Style" status={`layout: ${FIRST}`} className="pb-16">
      <FigureHeader title={<Title />} className="px-(--lp-gutter) pt-16 pb-10 md:pb-12" />
      <Stage
        table={table}
        names={names}
        wirings={wirings}
        hung={{ x: Array.from(ropes.x), y: Array.from(ropes.y) }}
        hardware={createHardware()}
      />
    </Figure>
  );
}
