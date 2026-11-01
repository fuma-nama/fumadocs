import type { ReactNode } from 'react';
import { asMarkdown } from 'fumadocs-core/server';
import { copy, plain } from '../../content';
import { Figure } from '../../ui/figure';
import { commas, FigureHeader, url } from '../../ui/heading';
import { FIRST, LAYOUTS, TABS, THEME_NAMES, THEMES } from './data';
import { createHardware } from './hardware';
import { loadInks } from './presets';
import { FIRST_POSE, hangRopes } from './scene';
import { Stage } from './stage';

export async function Style() {
  if (asMarkdown())
    return (
      <>
        <FigureHeader title={copy.style.title} />
        <p>{plain([copy.style.claims.join(' ')])}</p>
        <ul>
          <li>Restyle any layout or theme with CSS variables.</li>
          {TABS.map((id) => {
            const tab = copy.style.tabs[id];
            return (
              <li key={id}>
                <a href={url(tab.href)}>{tab.label}</a>: {tab.line}
                {id === 'layouts' && (
                  <ul>
                    <li>Layouts: {LAYOUTS.map((layout) => layout.name).join(', ')}</li>
                    <li>
                      <a href={url('/docs/ui/theme')}>Themes</a>:{' '}
                      {commas(THEMES, (theme) => (
                        <>
                          {THEME_NAMES[theme]} (<code>{theme}</code>)
                        </>
                      ))}
                      , each a stylesheet imported as{' '}
                      <code>{"@import 'fumadocs-ui/css/<id>.css';"}</code>
                    </li>
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </>
    );

  const table = await loadInks();
  // the desk's cables in its first pose settle here, once: the browser takes their shape
  const ropes = hangRopes(FIRST_POSE);
  // the long title's claims carry it on in its light voice, a line each after a lit lamp of the
  // switches' kind
  const claims: ReactNode[] = [];
  for (const claim of copy.style.claims) {
    claims.push(
      <li key={claim} className="relative ps-5.5 md:ps-3.5">
        <span
          aria-hidden
          className="absolute top-3.25 left-0 size-2 -translate-y-1/2 rounded-full border border-lp-ink bg-lp-sun after:absolute after:top-px after:left-px after:size-0.5 after:bg-lp-yellow"
        />
        {claim}
      </li>,
    );
  }

  return (
    <Figure id="style" aria-label="Style" status={`layout: ${FIRST}`} className="pb-16">
      <div className="px-(--lp-gutter) pt-16 pb-10 md:pb-12">
        <FigureHeader title={copy.style.title} className="max-w-6xl! text-pretty!" />
        <ul className="mt-6 flex flex-col gap-3 text-base font-light tracking-tight text-pretty">
          {claims}
        </ul>
      </div>
      <Stage
        table={table}
        hung={{ x: Array.from(ropes.x), y: Array.from(ropes.y) }}
        hardware={createHardware()}
      />
    </Figure>
  );
}
