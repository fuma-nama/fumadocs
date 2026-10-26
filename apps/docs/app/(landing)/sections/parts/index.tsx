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
import { DocsPreview, HeadlessPreview } from './preview';
import { Stage } from './stage';

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
    <Figure id="parts" aria-label="Parts" status={STATUS}>
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
        page={<DocsPreview code={code} />}
        headless={<HeadlessPreview />}
        snippets={snippets}
      />
    </Figure>
  );
}
