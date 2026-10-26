import type { ReactNode } from 'react';
import type { MDXComponents } from 'mdx/types';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import * as Twoslash from 'fumadocs-twoslash/ui';
import { Mermaid } from '@/components/mdx/mermaid';
import { copy } from '../../content';
import { Figure, FigureHeader } from '../../ui/figure';
import { blocks } from './blocks';
import { Press } from './press';
import { RailBed, RailColumn } from './rail';
import { quickStart } from './quick-start';
import type { Step } from './steps';

/** how the files of `content/` are pressed, in order */
const steps: Step[] = [
  { tab: '---', status: 'rendering <DocsTitle>' },
  { tab: '```npm', status: 'rendering <CodeBlockTabs>' },
  { tab: '```ts twoslash', status: 'running Twoslash' },
  { tab: '<Mermaid />', status: 'rendering <Mermaid>' },
];

const { h2: H2 } = defaultMdxComponents;

// the docs' components, `Mermaid` added as its docs tell
const components: MDXComponents = {
  ...defaultMdxComponents,
  ...Twoslash,
  Mermaid,
  // the page's headings sit under the figure's own h2
  h2: (props) => <H2 {...props} aria-level={4} />,
};

export function Write() {
  const [frontmatter, ...rest] = quickStart.entries;
  // the frontmatter becomes the page's title and description, as in the docs page
  const slots: ReactNode[] = [
    <div key={frontmatter.info.path}>
      <h3 className="text-[1.75em] font-semibold">{frontmatter.title}</h3>
      <p className="text-lg text-fd-muted-foreground">{frontmatter.description}</p>
    </div>,
  ];
  for (const entry of rest) {
    const Body = entry.body;
    slots.push(<Body key={entry.info.path} components={components} />);
  }

  return (
    <Figure n={3} id="write" aria-label="Write" status="compiled quick-start.mdx">
      <FigureHeader
        lead={copy.write.lead}
        title={copy.write.title}
        description={copy.write.description}
        // from lg one row: the title on the window's edge, the description on the bed's middle seam
        className="p-(--lp-gutter) pb-8 md:pt-10 lg:grid lg:grid-cols-2 lg:items-end lg:gap-x-0 lg:max-xl:pb-6 lg:max-xl:[&_h2]:text-5xl"
      />
      <Press
        steps={steps}
        sources={blocks}
        slots={slots}
        bed={<RailBed />}
        column={<RailColumn />}
      />
    </Figure>
  );
}
