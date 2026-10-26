import type { ReactNode } from 'react';
import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from 'fumadocs-ui/components/codeblock';
import type { CodeBlockProps } from 'fumadocs-ui/components/codeblock';
import { ServerCodeBlock } from '@/components/server-codeblock';
import { Figure, Lead } from '../../ui/figure';
import { copy } from '../../content';
import { install, OPTIONS, STATUS, SWAPS } from './data';
import type { Snippets } from './panel';
import { DocsPreview, HeadlessPreview, MobileHeadlessPreview, MobilePreview } from './preview';
import { Stack } from './stack';

/** the page's own code block, nothing on the landing scrolls but the page */
const still: CodeBlockProps = { viewportProps: { className: 'overflow-hidden' } };

/** an option's setup, without a frame of its own: it sits in one of our windows */
const framed: CodeBlockProps = {
  allowCopy: false,
  className: 'rounded-none border-0 bg-transparent',
  viewportProps: { className: 'py-3 text-[12px]/[16px] overflow-hidden' },
};

function highlight(lang: string, code: string): ReactNode {
  return <ServerCodeBlock key={code} lang={lang} code={code} codeblock={framed} />;
}

export function Parts() {
  const code = (
    <CodeBlockTabs defaultValue="npm">
      <CodeBlockTabsList>
        {install.map((tab) => (
          <CodeBlockTabsTrigger key={tab.value} value={tab.value}>
            {tab.value}
          </CodeBlockTabsTrigger>
        ))}
      </CodeBlockTabsList>
      {install.map((tab) => (
        <CodeBlockTab key={tab.value} value={tab.value}>
          <ServerCodeBlock lang="bash" code={tab.code} codeblock={still} />
        </CodeBlockTab>
      ))}
    </CodeBlockTabs>
  );

  const snippets: Snippets = { ui: [], content: [], framework: [], core: [] };
  for (const layer of SWAPS) {
    for (const option of OPTIONS[layer]) snippets[layer].push(highlight(option.lang, option.code));
  }
  for (const option of OPTIONS.framework) snippets.core.push(highlight(option.lang, option.core));

  return (
    <Figure n={2} id="parts" aria-label="Parts" status={STATUS}>
      <div className="flex flex-col gap-8 px-(--lp-gutter) pt-8 pb-10">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-x-12">
          <h2 className="text-4xl leading-[1.02] font-medium tracking-[-0.035em] text-balance md:text-6xl">
            <Lead>{copy.parts.lead}</Lead> {copy.parts.title}
          </h2>
          <p className="max-w-[46ch] text-lg leading-relaxed text-pretty text-lp-ink-2">
            {copy.parts.description}
          </p>
        </div>
        <Stack
          page={{ wide: <DocsPreview code={code} />, narrow: <MobilePreview code={code} /> }}
          headless={{ wide: <HeadlessPreview />, narrow: <MobileHeadlessPreview /> }}
          snippets={snippets}
        />
      </div>
    </Figure>
  );
}
