import type { ReactNode } from 'react';
import type { MDXComponents } from 'mdx/types';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import * as Twoslash from 'fumadocs-twoslash/ui';
import { Mermaid } from '@/components/mdx/mermaid';
import { copy } from '../../content';
import { Figure, FigureHeader, type Run, Terms } from '../../ui/figure';
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

interface PressProps {
  id: string;
  label: string;
  lead: string;
  title: string | readonly Run[];
  description?: string;
  /** the MDX file, its blocks compiled and their sources */
  file: string;
  entries: typeof quickStart.entries;
  sources: string[];
  steps: { tab: string; status: string }[];
}

/** a figure that types an MDX file block by block, and presses each into its page */
export function Press({
  id,
  label,
  lead,
  title,
  description,
  file,
  entries,
  sources,
  steps,
}: PressProps) {
  const slots: ReactNode[] = [];
  for (const entry of entries) {
    const Body = entry.body;
    slots.push(
      // a block of frontmatter renders as the page's title
      entry.title === undefined ? (
        <Body key={entry.info.path} components={components} />
      ) : (
        <div key={entry.info.path} className="not-prose">
          <h3 className="text-[1.75em] font-semibold">{entry.title}</h3>
          <p className="text-lg text-fd-muted-foreground">{entry.description}</p>
        </div>
      ),
    );
  }

  return (
    <Figure id={id} aria-label={label} status={`compiled ${file}`}>
      <FigureHeader
        lead={lead}
        title={typeof title === 'string' ? title : <Terms runs={title} />}
        description={description}
        className="px-(--lp-gutter) pt-16 pb-10 md:pt-10 md:pb-8"
      />
      <Stage
        file={file}
        steps={steps}
        sources={sources}
        slots={slots}
        bed={<RailBed stops={steps.length} />}
        column={<RailColumn id={id} />}
      />
    </Figure>
  );
}

export function Write() {
  return (
    <Press
      id="write"
      label="Write"
      {...copy.write}
      file="quick-start.mdx"
      entries={quickStart.entries}
      sources={blocks}
      steps={steps}
    />
  );
}
