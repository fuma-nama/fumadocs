import type { ReactNode } from 'react';
import type { MDXComponents } from 'mdx/types';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { TypeTable } from 'fumadocs-ui/components/type-table';
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
  TypeTable,
  // the page's headings sit under the figure's own h2
  h2: (props) => <H2 {...props} aria-level={4} />,
};

const FILE = 'quick-start.mdx';

/** a figure that types an MDX file block by block, and presses each into its page */
export function Write() {
  const slots: ReactNode[] = [];
  for (const entry of quickStart.entries) {
    const Body = entry.body;
    slots.push(
      // a block of frontmatter renders as the page's title
      entry.title === undefined ? (
        <Body key={entry.info.path} components={components} />
      ) : (
        // the docs page's own gap between its title and description
        <div key={entry.info.path} className="not-prose flex flex-col gap-4">
          <h3 className="text-[1.75em] font-semibold">{entry.title}</h3>
          <p className="text-lg text-fd-muted-foreground">{entry.description}</p>
        </div>
      ),
    );
  }

  return (
    <Figure id="write" aria-label="Write" status={`compiled ${FILE}`}>
      <FigureHeader
        title={copy.write.title}
        className="px-(--lp-gutter) pt-(--lp-section) pb-10 md:pb-12"
      />
      <Stage
        file={FILE}
        steps={steps}
        sources={blocks}
        slots={slots}
        bed={<RailBed stops={steps.length} />}
        column={<RailColumn id="write" />}
      />
    </Figure>
  );
}
