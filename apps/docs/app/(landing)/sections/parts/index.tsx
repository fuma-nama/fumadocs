import type { ReactNode } from 'react';
import type { CodeBlockProps } from 'fumadocs-ui/components/codeblock';
import { ServerCodeBlock } from '@/components/server-codeblock';
import { Figure, FigureHeader } from '../../ui/figure';
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
        header={<FigureHeader lead={copy.parts.lead} title={copy.parts.title} />}
        page={<DocsPreview />}
        headless={<HeadlessPreview />}
        snippets={snippets}
      />
    </Figure>
  );
}
