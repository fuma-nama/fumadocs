import type { ReactNode } from 'react';
import type { MDXComponents } from 'mdx/types';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import * as Twoslash from 'fumadocs-twoslash/ui';
import { Mermaid } from '@/components/mdx/mermaid';
import { copy } from '../../content';
import { Figure, FigureHeader } from '../../ui/figure';
import { blocks, quickStart, steps } from './data';
import { RailBed, RailColumn } from './rail';
import { Stage } from './stage';

const { h2: H2 } = defaultMdxComponents;

const components: MDXComponents = {
  ...defaultMdxComponents,
  ...Twoslash,
  Mermaid,
  // the page's headings sit under the figure's own h2
  h2: (props) => <H2 {...props} aria-level={4} />,
};

export function Write() {
  const [frontmatter, ...rest] = quickStart.entries;
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
    <Figure id="write" aria-label="Write" status="compiled quick-start.mdx">
      <FigureHeader
        lead={copy.write.lead}
        title={copy.write.title}
        description={copy.write.description}
        // from lg one row: the title on the window's edge, the description on the bed's middle seam
        className="p-(--lp-gutter) pb-8 md:pt-10 lg:grid lg:grid-cols-2 lg:items-end lg:gap-x-0 lg:max-xl:pb-6 lg:max-xl:[&_h2]:text-5xl"
      />
      <Stage
        steps={steps}
        sources={blocks}
        slots={slots}
        bed={<RailBed />}
        column={<RailColumn />}
      />
    </Figure>
  );
}
