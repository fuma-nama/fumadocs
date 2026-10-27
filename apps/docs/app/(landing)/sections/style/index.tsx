import type { ReactNode } from 'react';
import { copy } from '../../content';
import { Figure, FigureHeader, Terms } from '../../ui/figure';
import { FIRST } from './data';
import { createHardware } from './hardware';
import { loadInks } from './presets';
import { FIRST_POSE, hangRopes } from './scene';
import { Stage } from './stage';

/**
 * The long title: a statement (`Terms`, light with its key terms a step up), then the claims
 * carrying it on, a line each after a lit lamp of the switches' kind, stepping down by size and
 * spacing: the light voice a step under the statement from md, a body size on a phone's narrow
 * measure.
 */
function Title() {
  const claims: ReactNode[] = [];
  for (const claim of copy.style.claims) {
    claims.push(
      <span key={claim} className="relative block ps-[1.4em] md:ps-[0.85em]">
        <span
          aria-hidden
          className="absolute top-[0.55lh] left-0 size-[0.5em] -translate-y-1/2 rounded-full border border-lp-ink bg-lp-sun after:absolute after:top-[22%] after:left-[22%] after:size-0.5 after:bg-lp-yellow md:size-2"
        />{' '}
        {claim}
      </span>,
    );
  }

  return (
    <>
      <span className="block max-w-[29em]">
        <Terms runs={copy.style.title} />
      </span>{' '}
      <span className="lp-voice mt-6 flex flex-col gap-3 text-base">{claims}</span>
    </>
  );
}

export async function Style() {
  const table = await loadInks();
  // the desk's cables in its first pose settle here, once: the browser takes their shape
  const ropes = hangRopes(FIRST_POSE);

  return (
    <Figure id="style" aria-label="Style" status={`layout: ${FIRST}`} className="pb-16">
      <FigureHeader title={<Title />} className="px-(--lp-gutter) pt-16 pb-10 md:pb-12" />
      <Stage
        table={table}
        hung={{ x: Array.from(ropes.x), y: Array.from(ropes.y) }}
        hardware={createHardware()}
      />
    </Figure>
  );
}
