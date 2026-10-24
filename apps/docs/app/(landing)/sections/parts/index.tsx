import type { ReactNode } from 'react';
import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from 'fumadocs-ui/components/codeblock';
import type { CodeBlockProps } from 'fumadocs-ui/components/codeblock';
import { ServerCodeBlock } from '@/components/server-codeblock';
import { Figure } from '../../ui/figure';
import { install, slots, STATUS } from './data';
import { Body } from './body';
import type { Snippets, SwapLayer } from './swap';
import { DocsPreview } from './preview';

/** the page's own code block, nothing on the landing scrolls but the page */
const still: CodeBlockProps = { viewportProps: { className: 'overflow-hidden' } };

/** an option's setup, without a frame of its own: it sits in one of our windows */
const framed: CodeBlockProps = {
  allowCopy: false,
  className: 'rounded-none border-0 bg-transparent',
  viewportProps: { className: 'py-3 text-[12px]/[16px] overflow-hidden' },
};

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

  const snippets = { ui: [], content: [], framework: [] } as Snippets;
  for (const slot of slots) {
    if (!slot.swappable) continue;
    const list: ReactNode[] = [];
    for (const option of slot.options) {
      list.push(
        <ServerCodeBlock
          key={option.name}
          lang={option.lang}
          code={option.code}
          codeblock={framed}
        />,
      );
    }
    snippets[slot.layer as SwapLayer] = list;
  }

  return (
    <Figure n={2} id="parts" aria-label="Parts" status={STATUS[0]}>
      <Body code={code} page={<DocsPreview code={code} />} snippets={snippets} />
    </Figure>
  );
}
