import type { ReactNode } from 'react';
import type { CodeBlockProps } from 'fumadocs-ui/components/codeblock';
import { ServerCodeBlock } from '@/components/server-codeblock';
import { Figure, Lead } from '../../ui/figure';
import { copy } from '../../content';
import { OPTIONS, SWAPS } from './data';
import type { Snippets } from './panel';
import { DocsPreview, HeadlessPreview } from './preview';
import { Stage } from './stage';

/** an option's setup, without a frame of its own: it sits in one of our windows */
const framed: CodeBlockProps = {
  allowCopy: false,
  className: 'rounded-none border-0 bg-transparent',
  viewportProps: { className: 'py-3 text-[12px]/[16px] overflow-hidden' },
};

function highlight(file: string, code: string): ReactNode {
  const lang = file.slice(file.lastIndexOf('.') + 1);
  return <ServerCodeBlock key={code} lang={lang} code={code} codeblock={framed} />;
}

export function Parts() {
  const snippets: Snippets = { ui: [], content: [], framework: [], core: [] };
  for (const layer of SWAPS) {
    for (const option of OPTIONS[layer]) snippets[layer].push(highlight(option.file, option.code));
  }
  for (const option of OPTIONS.framework) snippets.core.push(highlight(option.file, option.core));

  return (
    <Figure id="parts" aria-label="Parts" status="4 layers">
      <Stage
        header={
          // split like the stage's columns only when it spans the stage
          <div className="grid gap-4 @min-[60rem]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] @min-[60rem]:items-end @min-[60rem]:gap-x-12">
            <h2 className="text-4xl leading-[1.02] font-medium tracking-[-0.035em] text-balance md:text-6xl">
              <span data-rise className="block">
                <Lead>{copy.parts.lead}</Lead>
              </span>{' '}
              <span data-rise className="block">
                {copy.parts.title}
              </span>
            </h2>
            <p data-rise className="max-w-[46ch] text-lg leading-relaxed text-pretty text-lp-ink-2">
              {copy.parts.description}
            </p>
          </div>
        }
        page={<DocsPreview />}
        headless={<HeadlessPreview />}
        snippets={snippets}
      />
    </Figure>
  );
}
