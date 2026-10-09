'use client';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Figure, type Line, Lines, Panel, Scenes, enter, useSteps } from './figure';

/** Markdown from the edits of plugins, in the colors of diffs */
const added = 'bg-fd-diff-add ring-1 ring-green-700/70 dark:ring-fd-diff-add-symbol/60';
const addedLine =
  '-mx-3 px-3 bg-fd-diff-add shadow-[inset_2px_0_0] shadow-green-700 dark:shadow-fd-diff-add-symbol';
const fold = 'font-sans text-fd-muted-foreground italic';

const source: Line[] = [
  '## Installation',
  '',
  '```npm',
  'npm i fumadocs-core',
  '```',
  '',
  '![Preview](./preview.png)',
  '',
  '<auto-type-table path="./props.ts" name="Options" />',
];

/** Markdown that shouldn't be there, underlined like a spelling error */
function Noise({ children }: { children: string }) {
  const indent = /^ */.exec(children)![0];

  return (
    <>
      {indent}
      <span className="underline decoration-fd-error decoration-wavy underline-offset-[3px]">
        {children.slice(indent.length)}
      </span>
    </>
  );
}

// 16.16, abridged
const treeOutput: Line[] = [
  '## Installation [#installation]',
  '',
  { text: <Noise>{'<CodeBlockTabs defaultValue="npm">'}</Noise> },
  { text: '… 42 more lines', className: fold },
  '',
  { text: <Noise>{'<img alt="Preview" src="__img0" />'}</Noise> },
  '',
  { text: <Noise>{'<TypeTable'}</Noise> },
  { text: <Noise>{'  id="type-table-props.ts-Options"'}</Noise> },
  { text: <Noise>{'  type="{'}</Noise> },
  { text: <Noise>{'  &#x22;id&#x22;: &#x22;props.ts-Options&#x22;,'}</Noise> },
  { text: '… 29 more lines', className: fold },
];

// 16.17, abridged
const sourceOutput: Line[] = [
  {
    text: (
      <>
        ## Installation<span className={cn('rounded-sm', added)}> [#installation]</span>
      </>
    ),
  },
  { text: '… 7 lines as written', className: fold },
  ...[
    '### Options',
    '',
    '| Prop       | Type     | Description                           |',
    '| ---------- | -------- | ------------------------------------- |',
    '| `dir`      | `string` | The directory of pages.               |',
    "| `baseUrl?` | `string` | The base URL of pages. Default: `'/'` |",
  ].map((text) => ({ text, className: addedLine })),
];

function Generated({ children }: { children: string }) {
  return <span className="rounded-sm border border-dashed px-1">{children}</span>;
}

function Tag({ added: isAdded, children }: { added?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        'ms-2 inline-block rounded-full border px-1.5 font-sans text-[10px] leading-4',
        isAdded ? cn('border-transparent', added) : 'text-fd-muted-foreground',
      )}
    >
      {children}
    </span>
  );
}

interface Change {
  plugin: string;
  /** the change to the syntax tree, for rendering */
  tree: ReactNode;
  /** the Markdown recorded by the plugin */
  markdown: ReactNode;
}

const arrow = <span className="text-fd-muted-foreground"> → </span>;

const changes: Change[] = [
  {
    plugin: 'remark-heading',
    tree: (
      <>
        heading<Tag>id: installation</Tag>
      </>
    ),
    markdown: (
      <>
        ## Installation<span className={cn('rounded-sm', added)}> [#installation]</span>
      </>
    ),
  },
  {
    plugin: 'remark-npm',
    tree: (
      <>
        code{arrow}
        <Generated>{'<CodeBlockTabs>'}</Generated>
      </>
    ),
    markdown: (
      <>
        ```npm … ```<Tag>as written</Tag>
      </>
    ),
  },
  {
    plugin: 'remark-image',
    tree: (
      <>
        image{arrow}
        <Generated>{'<img src={__img0} />'}</Generated>
      </>
    ),
    markdown: (
      <>
        ![Preview](./preview.png)<Tag>as written</Tag>
      </>
    ),
  },
  {
    plugin: 'auto-type-table',
    tree: (
      <>
        {'<auto-type-table>'}
        {arrow}
        <Generated>{'<TypeTable />'}</Generated>
      </>
    ),
    markdown: (
      <>
        <span className="rounded-sm bg-fd-diff-remove line-through decoration-fd-diff-remove-symbol">
          {'<auto-type-table … />'}
        </span>
        <Tag added>→ a table</Tag>
      </>
    ),
  },
];

const row = 'grid gap-x-4 gap-y-0.5 py-1.5 sm:grid-cols-[7.5rem_1fr_1fr]';

/**
 * The changes of plugins.
 *
 * @param count - the number of changes shown, the last one enters
 * @param markdown - show the Markdown recorded by plugins
 */
function Changes({ count, markdown }: { count: number; markdown: boolean }) {
  const columns = !markdown && 'sm:grid-cols-[7.5rem_1fr]';

  return (
    <div className={cn('w-full rounded-lg border bg-fd-background px-3', !markdown && 'sm:w-auto')}>
      <div className={cn(row, columns, 'border-b font-sans font-medium max-sm:hidden')}>
        <span>Plugin</span>
        <span>
          Syntax tree <span className="font-normal text-fd-muted-foreground">for rendering</span>
        </span>
        {markdown && (
          <span>
            Markdown{' '}
            <span className="font-normal text-fd-muted-foreground">your source + edits</span>
          </span>
        )}
      </div>
      {changes.map((change, i) => {
        if (i >= count) return null;
        // the changes of previous steps stay
        const motion = markdown && i < count - 1 ? undefined : enter(markdown ? 0 : i);

        return (
          <div
            key={change.plugin}
            className={cn(row, columns, 'not-last:border-b', motion?.className)}
            style={motion?.style}
          >
            <span className="font-sans text-fd-muted-foreground">{change.plugin}</span>
            <span className="[overflow-wrap:anywhere]">{change.tree}</span>
            {markdown && <span className="[overflow-wrap:anywhere]">{change.markdown}</span>}
          </div>
        );
      })}
    </div>
  );
}

const treeCaptions = [
  'You write 9 lines of MDX.',
  'Remark plugins transform the syntax tree for rendering.',
  '16.16 stringified the tree, so everything generated for rendering ended up in the Markdown.',
];

const sourceCaptions = [
  'remark-heading: an ID in the tree, [#installation] in the Markdown.',
  'remark-npm: tabs in the tree, the code block stays in the Markdown.',
  'remark-image: an import in the tree, the image stays in the Markdown.',
  'auto-type-table: a type table in the tree, a Markdown table in the Markdown.',
  'The Markdown is your source, with the edits applied.',
];

/**
 * @param from - where the Markdown is generated from
 */
export function Pipeline({ from }: { from: 'tree' | 'source' }) {
  const steps = useSteps(from === 'tree' ? treeCaptions : sourceCaptions);
  const output = (
    <Panel
      key="output"
      label="Markdown"
      aside={
        from === 'tree' ? (
          <span className="inline-flex items-center gap-1.5">
            <Noise>{'\u00a0'.repeat(5)}</Noise> from generated nodes · 81 lines
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <span className={cn('size-2.5 rounded-sm', added)} /> edits of plugins · 14 lines
          </span>
        )
      }
      className={cn('w-full', enter(0).className)}
      style={enter(0).style}
    >
      <Lines lines={from === 'tree' ? treeOutput : sourceOutput} />
    </Panel>
  );

  const scenes =
    from === 'tree'
      ? [
          <Panel
            key="source"
            label="page.mdx"
            className={cn('w-full max-w-md', enter(0).className)}
            style={enter(0).style}
          >
            <Lines lines={source} />
          </Panel>,
          <Changes key="tree" count={changes.length} markdown={false} />,
          output,
        ]
      : [...changes.map((_, i) => <Changes key={i} count={i + 1} markdown />), output];

  return (
    <Figure steps={steps}>
      <Scenes step={steps.step}>{scenes}</Scenes>
    </Figure>
  );
}
