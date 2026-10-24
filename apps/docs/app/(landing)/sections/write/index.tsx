import type { ReactNode } from 'react';
import { Text } from 'lucide-react';
import type { MDXComponents } from 'mdx/types';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import * as Twoslash from 'fumadocs-twoslash/ui';
import { TOCProvider, TOCScrollArea } from 'fumadocs-ui/components/toc';
import { TOCItem, TOCItems } from 'fumadocs-ui/components/toc/default';
import { Mermaid } from '@/components/mdx/mermaid';
import { copy } from '../../content';
import { Figure, FigureHeader } from '../../ui/figure';
import { blocks } from './blocks';
import { quickStart } from './quick-start';
import { Screen } from './screen';
import type { Step } from './steps';

/** how the files of `content/` play, in order */
const steps: Step[] = [
  { status: 'compiling frontmatter', kind: 'frontmatter', label: 'title' },
  {
    status: 'compiling ```npm',
    kind: 'npm',
    label: '<CodeBlockTabs>',
    // one command, four package managers
    copies: 4,
    toc: true,
  },
  {
    status: 'running twoslash',
    kind: 'Twoslash',
    label: '<pre>',
    late: '.twoslash-completion-list',
  },
  {
    status: 'rendering <Mermaid>',
    kind: 'Mermaid',
    label: '<Mermaid>',
    late: '.pele-node, .pele-edge',
  },
];

const { h2: H2 } = defaultMdxComponents;

// the docs' components, `Mermaid` added as its docs tell
const components: MDXComponents = {
  ...defaultMdxComponents,
  ...Twoslash,
  Mermaid,
  // the preview's headings sit under the figure's own h2
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
  let toc = frontmatter.toc;
  for (const entry of rest) {
    const Body = entry.body;
    slots.push(<Body key={entry.info.path} components={components} />);
    if (entry.toc.length > 0) toc = entry.toc;
  }

  return (
    <Figure n={3} id="write" aria-label="Write" status="editing quick-start.mdx">
      <FigureHeader
        lead={copy.write.lead}
        title={copy.write.title}
        description={copy.write.description}
        className="p-(--lp-gutter) pb-10 md:pt-10"
      />
      <Screen
        steps={steps}
        sources={blocks}
        slots={slots}
        toc={
          <TOCProvider toc={toc}>
            <p className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground">
              <Text className="size-4" />
              On this page
            </p>
            <TOCScrollArea data-toc>
              <TOCItems>
                {toc.map((item) => (
                  <TOCItem key={item.url} item={item} />
                ))}
              </TOCItems>
            </TOCScrollArea>
          </TOCProvider>
        }
      />
    </Figure>
  );
}
