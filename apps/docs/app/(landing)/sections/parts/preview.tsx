import type { ReactNode } from 'react';
import {
  Book,
  ChevronDown,
  CircleQuestionMark,
  CpuIcon,
  DatabaseIcon,
  Menu,
  PanelsTopLeftIcon,
  Rocket,
  Scale,
  Search,
  SidebarIcon,
  TerminalIcon,
  Text,
  Wrench,
} from 'lucide-react';
import { Callout } from 'fumadocs-ui/components/callout';
import { Card, Cards } from 'fumadocs-ui/components/card';
import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from 'fumadocs-ui/components/codeblock';
import type { CodeBlockProps } from 'fumadocs-ui/components/codeblock';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { DocsBody, DocsDescription } from 'fumadocs-ui/layouts/docs/page';
import { FullSearchTrigger } from 'fumadocs-ui/layouts/shared/slots/search-trigger';
import { ThemeSwitch } from 'fumadocs-ui/layouts/shared/slots/theme-switch';
import { ServerCodeBlock } from '@/components/server-codeblock';
import { cn } from '@/lib/cn';
import { install, toc } from './data';

// classes of `layouts/docs/slots/sidebar.tsx`
const item =
  'relative flex flex-row items-center gap-2 rounded-lg p-2 text-start text-fd-muted-foreground wrap-anywhere [&_svg]:size-4 [&_svg]:shrink-0';

/** the sidebar of fumadocs.dev's own docs, as `source.getPageTree()` hands it over */
const tree = [
  { separator: 'Introduction' },
  { name: 'Quick Start', icon: <Rocket />, active: true },
  { name: 'What is Fumadocs', icon: <CircleQuestionMark /> },
  { name: 'Comparisons', icon: <Scale /> },
  { name: 'Manual Installation', icon: <Wrench /> },
  { name: 'Guides', icon: <Book />, folder: true },
  { separator: 'Writing' },
  { name: 'Page Slugs & Page Tree' },
  { name: 'Markdown', folder: true },
];

/** the layers on fumadocs.dev's Quick Start, as its `<Cards>` list them */
const layers = [
  {
    title: 'Fumadocs Core',
    icon: <CpuIcon />,
    text: 'Handles most of the logic, including document search, content source adapters, and Markdown extensions.',
  },
  {
    title: 'Fumadocs UI',
    icon: <PanelsTopLeftIcon />,
    text: 'The default theme of Fumadocs offers a beautiful look for documentation sites and interactive components.',
  },
  {
    title: 'Content Source',
    icon: <DatabaseIcon />,
    text: 'The source of your content, can be a CMS or local data layers like Fumadocs MDX (the official content source).',
  },
  {
    title: 'Fumadocs CLI',
    icon: <TerminalIcon />,
    text: 'A command line tool to install UI components and automate things, useful for customizing layouts.',
  },
];

/** the icon buttons of the docs layout's navbar */
const navButton = cn(
  buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
  'text-fd-muted-foreground',
);

/** a prose heading as text: the page's headings are not the landing's */
const heading = 'not-prose mt-[2em] mb-[1em] text-[1.5em] leading-[1.333] font-semibold [&+*]:mt-0';

/** the page's own code block: nothing on the landing scrolls but the page */
const still: CodeBlockProps = { viewportProps: { className: 'overflow-hidden' } };

/**
 * fumadocs.dev's Quick Start in the default docs layout, reflowing with the face it is laid on: a
 * phone's navbar, the sidebar from 700px, the table of contents from 1100px. The content and the
 * search trigger and theme switch are the real components; the chrome mirrors the markup of
 * `fumadocs-ui/layouts/docs`, whose providers need a full page, with its links as plain text.
 */
export function DocsPreview() {
  const items: ReactNode[] = [];
  for (const node of tree) {
    if ('separator' in node) {
      items.push(
        <p
          key={node.separator}
          className="mt-6 mb-1 inline-flex items-center gap-2 px-2 first:mt-0"
        >
          {node.separator}
        </p>,
      );
      continue;
    }
    items.push(
      <span
        key={node.name}
        className={cn(
          item,
          node.active && 'bg-fd-primary/10 text-fd-primary',
          node.folder && 'w-full',
        )}
      >
        {node.icon}
        {node.name}
        {node.folder && <ChevronDown className="ms-auto -rotate-90" />}
      </span>,
    );
  }

  const cards: ReactNode[] = [];
  for (const layer of layers)
    cards.push(
      <Card key={layer.title} icon={layer.icon} title={layer.title}>
        {layer.text}
      </Card>,
    );

  return (
    <div className="flex size-full flex-col bg-fd-background text-fd-foreground @min-[700px]:grid @min-[700px]:grid-cols-[248px_minmax(0,1fr)] @min-[1100px]:grid-cols-[268px_minmax(0,1fr)_240px]">
      <div className="flex h-14 shrink-0 items-center gap-1 border-b px-4 @min-[700px]:hidden">
        <Brand />
        <span className={navButton}>
          <Search />
        </span>
        <span className={navButton}>
          <Menu />
        </span>
      </div>
      <div className="hidden min-h-0 flex-col border-e bg-fd-card pb-6 text-sm @min-[700px]:flex">
        <div className="flex flex-col gap-3 p-4 pb-2">
          <div className="flex">
            <Brand />
            <span className={cn(navButton, 'mb-auto')}>
              <SidebarIcon />
            </span>
          </div>
          <FullSearchTrigger />
        </div>
        <div className="flex flex-col gap-0.5 p-4 px-2">{items}</div>
        <div className="flex-1" />
        <div className="flex flex-col p-4 pt-2">
          <div className="flex items-center rounded-lg border bg-fd-secondary/50 p-0.5 pe-0 text-fd-muted-foreground">
            <span className={buttonVariants({ size: 'icon-sm', variant: 'ghost' })}>
              <svg aria-hidden viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
            </span>
            <ThemeSwitch className="ms-auto rounded-none border-y-0 border-e-0 px-1 py-0 *:rounded-md" />
          </div>
        </div>
      </div>
      <article className="flex min-w-0 flex-col px-4 pt-6 @min-[700px]:px-8 @min-[700px]:pt-12">
        <div className="mb-8 flex flex-col gap-4">
          {/* the classes of `DocsTitle`, not an h1 so the landing keeps one */}
          <p className="text-[1.75em] font-semibold">Quick Start</p>
          <DocsDescription className="mb-0">Getting Started with Fumadocs</DocsDescription>
        </div>
        <DocsBody>
          <p className={heading}>Introduction</p>
          <p>
            Fumadocs <span className="text-sm text-fd-muted-foreground">(Foo-ma docs)</span> is a{' '}
            <strong>documentation framework</strong>, designed to be fast, flexible, and composes
            seamlessly into your React framework. It consists of multiple layers:
          </p>
          <Cards>{cards}</Cards>
          <Callout title="Want to learn more?">
            Read our in-depth <span className="font-medium underline">What is Fumadocs</span>{' '}
            introduction.
          </Callout>
          <p className={heading}>Automatic Installation</p>
          <p>A minimum version of Node.js 22 required.</p>
          <div>
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
          </div>
        </DocsBody>
      </article>
      <div className="-ms-3 mt-12 hidden min-h-0 flex-col self-start p-3 @min-[1100px]:flex">
        <TocBlock />
      </div>
    </div>
  );
}

/** the same page on a UI of your own: what `fumadocs-core` hands over, as plain elements */
export function HeadlessPreview() {
  const items: ReactNode[] = [];
  for (const node of tree) {
    if ('separator' in node) {
      items.push(
        <li key={node.separator} className="mt-3 list-none font-semibold">
          {node.separator}
        </li>,
      );
      continue;
    }
    items.push(
      <li key={node.name} className={node.active ? 'font-semibold' : undefined}>
        <span className="underline underline-offset-2">{node.name}</span>
      </li>,
    );
  }

  const headings: ReactNode[] = [];
  for (const entry of toc) {
    headings.push(
      <li key={entry.url} className={entry.depth > 2 ? 'ms-5' : undefined}>
        <span className="underline underline-offset-2">{entry.title}</span>
      </li>,
    );
  }

  const list: ReactNode[] = [];
  for (const layer of layers)
    list.push(
      <li key={layer.title}>
        <span className="font-semibold">{layer.title}</span>: {layer.text}
      </li>,
    );

  return (
    <div className="flex size-full flex-col gap-4 bg-lp-paper px-4 pt-5 text-base leading-normal text-lp-ink @min-[700px]:grid @min-[700px]:grid-cols-[220px_minmax(0,1fr)] @min-[700px]:gap-0 @min-[700px]:p-0 @min-[1100px]:grid-cols-[220px_minmax(0,1fr)_220px]">
      <p className="flex justify-between @min-[700px]:hidden">
        <span className="font-semibold">Fumadocs</span>
        <span className="underline underline-offset-2">Menu</span>
      </p>
      <div className="hidden flex-col gap-3 p-4 @min-[700px]:flex">
        <p className="font-semibold">Fumadocs</p>
        <p className="text-lp-ink-2">Search</p>
        <ul className="list-disc ps-5">{items}</ul>
      </div>
      <article className="flex flex-col gap-4 @min-[700px]:px-8 @min-[700px]:pt-14">
        <p className="text-[2em] leading-tight font-bold">Quick Start</p>
        <p>Getting Started with Fumadocs</p>
        <p className="mt-2 text-[1.5em] font-bold">Introduction</p>
        <p>
          Fumadocs (Foo-ma docs) is a documentation framework, designed to be fast, flexible, and
          composes seamlessly into your React framework. It consists of multiple layers:
        </p>
        <ul className="list-disc ps-5">{list}</ul>
      </article>
      <div className="hidden flex-col gap-2 p-4 pt-10 @min-[1100px]:flex">
        <p className="font-semibold">On this page</p>
        <ul className="list-disc ps-5">{headings}</ul>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <span className="me-auto inline-flex items-center gap-2.5 text-[0.9375rem] font-medium">
      <span className="size-5 rounded-full border bg-fd-primary" />
      Fumadocs
    </span>
  );
}

// `TOCItem` and its track from `components/toc/default.tsx`, without the anchors, for depths 2 and 3
function lineOffset(depth: number) {
  return depth > 2 ? 16 : 8;
}

function TocBlock() {
  const items: ReactNode[] = [];
  for (let i = 0; i < toc.length; i++) {
    const entry = toc[i];
    const l1 = lineOffset(entry.depth);
    const l0 = i === 0 ? l1 : lineOffset(toc[i - 1].depth);
    const l2 = i === toc.length - 1 ? l1 : lineOffset(toc[i + 1].depth);
    const active = i === 0;
    items.push(
      <p
        key={entry.url}
        className={cn(
          'relative py-1.5 text-sm text-fd-muted-foreground wrap-anywhere',
          i === 0 && 'pt-0',
          i === toc.length - 1 && 'pb-0',
          active && 'text-fd-primary',
        )}
        style={{ paddingInlineStart: entry.depth > 2 ? 32 : 20 }}
      >
        <svg
          aria-hidden
          className={cn(
            'absolute -top-1.5 bottom-0 -z-1 h-[calc(100%+--spacing(1.5))] inset-s-0',
            l1 !== l2 && 'bottom-1.5 h-full',
          )}
          style={{ width: Math.max(l0, l1) + 9 }}
        >
          {l0 !== l1 && (
            <path
              d={`M ${l0 + 0.5} 0 C ${l0 + 0.5} 8 ${l1 + 0.5} 4 ${l1 + 0.5} 12`}
              strokeWidth="1"
              fill="none"
              className="stroke-fd-foreground/10"
            />
          )}
          <line
            x1={l1 + 0.5}
            y1={l0 === l1 ? '6' : '12'}
            x2={l1 + 0.5}
            y2="100%"
            strokeWidth="1"
            className={active ? 'stroke-fd-primary' : 'stroke-fd-foreground/10'}
          />
        </svg>
        {entry.title}
      </p>,
    );
  }

  return (
    <>
      <p className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground">
        <Text className="size-4" />
        On this page
      </p>
      <div className="relative isolate ms-px flex flex-col py-3 text-sm">{items}</div>
    </>
  );
}
