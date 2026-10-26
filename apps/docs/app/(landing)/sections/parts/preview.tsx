import type { ReactNode } from 'react';
import { Book, ChevronDown, Menu, Palette, Rocket, Search, SidebarIcon, Text } from 'lucide-react';
import { Callout } from 'fumadocs-ui/components/callout';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { DocsBody, DocsDescription } from 'fumadocs-ui/layouts/docs/page';
import { FullSearchTrigger } from 'fumadocs-ui/layouts/shared/slots/search-trigger';
import { ThemeSwitch } from 'fumadocs-ui/layouts/shared/slots/theme-switch';
import { cn } from '@/lib/cn';
import { toc } from './data';
import { NARROW, WIDE } from './geometry';

// classes of `layouts/docs/slots/sidebar.tsx`
const item =
  'relative flex flex-row items-center gap-2 rounded-lg p-2 text-start text-fd-muted-foreground wrap-anywhere [&_svg]:size-4 [&_svg]:shrink-0';

/** the page tree of the sample docs, as `source.getPageTree()` would hand it to the sidebar */
const tree = [
  { name: 'Introduction', icon: <Book /> },
  { name: 'Quick Start', icon: <Rocket />, active: true },
  { name: 'Themes', icon: <Palette /> },
  { separator: 'Writing' },
  { name: 'Markdown' },
  { name: 'Search' },
  { name: 'Components', folder: true },
];

const grid = 'grid grid-cols-[268px_minmax(0,1fr)_268px] grid-rows-1';

/**
 * The default docs layout with a quick start page, at its desktop sizes. Callout, code block,
 * description, body, search trigger and theme switch are the real components; the layout chrome
 * mirrors the markup of `fumadocs-ui/layouts/docs`, whose providers need a full page, and its
 * links are plain text here.
 */
export function DocsPreview({ code }: { code: ReactNode }) {
  return (
    <div
      className={cn(grid, 'relative isolate bg-fd-background text-fd-foreground')}
      style={{ width: WIDE.width, height: WIDE.height }}
    >
      {/* a foot 12px or more clear of the slab's front edge on screen */}
      <div className="flex min-h-0 flex-col border-e bg-fd-card pb-6 text-sm">
        <div className="flex flex-col gap-3 p-4 pb-2">
          <div className="flex">
            <NavRow />
          </div>
          <div className="flex flex-col">
            <FullSearchTrigger />
          </div>
        </div>
        <TreeItems className="px-2" />
        <div className="flex-1" />
        <SidebarFooter />
      </div>

      <article className="flex min-w-0 flex-col gap-4 px-8 pt-12 pb-6">
        <div className="mb-8 flex flex-col gap-4">
          <TitleBlock />
        </div>
        <DocsBody>
          <div>
            <CalloutBlock />
          </div>
          <CodeSection code={code} />
        </DocsBody>
      </article>

      <div className="-ms-3 mt-8 flex min-h-0 flex-col self-start p-3">
        <TocBlock />
      </div>
    </div>
  );
}

/**
 * The same page with the UI swapped for your own: what `fumadocs-core` hands over (the page tree,
 * the TOC, the page's title and body) rendered as plain elements, the starting point of a UI you
 * build yourself.
 */
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

  return (
    <div
      className={cn(grid, 'bg-lp-paper text-base leading-normal text-lp-ink')}
      style={{ width: WIDE.width, height: WIDE.height }}
    >
      <div className="flex flex-col gap-3 p-4">
        <p className="font-semibold">My Docs</p>
        <p className="text-lp-ink-2">Search</p>
        <ul className="list-disc ps-5">{items}</ul>
      </div>
      <article className="flex flex-col gap-4 px-8 pt-14">
        <p className="text-[2em] leading-tight font-bold">Quick Start</p>
        <p>Create your first docs site.</p>
        <blockquote className="border-s-2 border-lp-line-strong ps-4">
          <p className="font-semibold">Good to know</p>
          <p>
            For full control over the UI, install the layout with Fumadocs CLI and edit the
            components directly.
          </p>
        </blockquote>
        <p className="mt-2 text-[1.5em] font-bold">Installation</p>
        <pre className="font-mono text-sm">npm create fumadocs-app</pre>
      </article>
      <div className="flex flex-col gap-2 p-4 pt-10">
        <p className="font-semibold">On this page</p>
        <ul className="list-disc ps-5">{headings}</ul>
      </div>
    </div>
  );
}

/** the icon buttons of the docs layout's navbar on a phone */
const navButton = cn(
  buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
  'text-fd-muted-foreground',
);

/**
 * The same page at a phone's width: the docs layout's navbar, the sidebar behind its menu button,
 * then the page. Callout, code block and description are the real components.
 */
export function MobilePreview({ code }: { code: ReactNode }) {
  return (
    <div
      className="flex flex-col bg-fd-background text-fd-foreground"
      style={{ width: NARROW.width, height: NARROW.height }}
    >
      <div className="flex h-14 shrink-0 items-center gap-1 border-b px-4">
        <span className="me-auto inline-flex items-center gap-2.5 text-[0.9375rem] font-medium">
          <span className="size-5 rounded-full border bg-fd-primary" />
          My Docs
        </span>
        <span className={navButton}>
          <Search />
        </span>
        <span className={navButton}>
          <Menu />
        </span>
      </div>
      <article className="flex min-w-0 flex-col gap-4 px-4 pt-6">
        <div className="mb-2 flex flex-col gap-4">
          <TitleBlock />
        </div>
        <DocsBody>
          <CalloutBlock />
          <CodeSection code={code} />
        </DocsBody>
      </article>
    </div>
  );
}

/** the headless page at a phone's width: the page itself, the tree behind its menu */
export function MobileHeadlessPreview() {
  return (
    <div
      className="flex flex-col gap-4 bg-lp-paper px-4 pt-5 text-base leading-normal text-lp-ink"
      style={{ width: NARROW.width, height: NARROW.height }}
    >
      <p className="flex justify-between">
        <span className="font-semibold">My Docs</span>
        <span className="underline underline-offset-2">Menu</span>
      </p>
      <p className="mt-4 text-[2em] leading-tight font-bold">Quick Start</p>
      <p>Create your first docs site.</p>
      <blockquote className="border-s-2 border-lp-line-strong ps-4">
        <p className="font-semibold">Good to know</p>
        <p>
          For full control over the UI, install the layout with Fumadocs CLI and edit the components
          directly.
        </p>
      </blockquote>
      <p className="mt-2 text-[1.5em] font-bold">Installation</p>
      <pre className="font-mono text-sm">npm create fumadocs-app</pre>
    </div>
  );
}

function NavRow() {
  return (
    <>
      <span className="me-auto inline-flex items-center gap-2.5 text-[0.9375rem] font-medium">
        <span className="size-5 rounded-full border bg-fd-primary" />
        My Docs
      </span>
      <span
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'mb-auto text-fd-muted-foreground',
        )}
      >
        <SidebarIcon />
      </span>
    </>
  );
}

function TreeItems({ className }: { className?: string }) {
  const items: ReactNode[] = [];
  for (const node of tree) {
    if ('separator' in node) {
      items.push(
        <p key={node.separator} className="mt-6 mb-1 inline-flex items-center gap-2 px-2">
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
  return <div className={cn('flex flex-col gap-0.5 p-4', className)}>{items}</div>;
}

function SidebarFooter() {
  return (
    <div className="flex flex-col p-4 pt-2">
      <div className="flex items-center rounded-lg border bg-fd-secondary/50 p-0.5 pe-0 text-fd-muted-foreground">
        <span className={buttonVariants({ size: 'icon-sm', variant: 'ghost' })}>
          <GitHub />
        </span>
        <ThemeSwitch className="ms-auto rounded-none border-y-0 border-e-0 px-1 py-0 *:rounded-md" />
      </div>
    </div>
  );
}

function TitleBlock() {
  return (
    <>
      {/* the classes of `DocsTitle`, not an h1 so the landing keeps one */}
      <p className="text-[1.75em] font-semibold">Quick Start</p>
      <DocsDescription className="mb-0">Create your first docs site.</DocsDescription>
    </>
  );
}

function CalloutBlock() {
  return (
    <Callout title="Good to know">
      For full control over the UI, install the layout with Fumadocs CLI and edit the components
      directly.
    </Callout>
  );
}

function CodeSection({ code }: { code: ReactNode }) {
  return (
    <>
      {/* the prose `h2`, as text: the page's headings are not the landing's */}
      <p className="not-prose mt-[2em] mb-[1em] text-[1.5em] leading-[1.333] font-semibold [&+*]:mt-0">
        Installation
      </p>
      <div>{code}</div>
    </>
  );
}

// `TOCItem` and its track from `components/toc/default.tsx`, without the anchors
const BASE = 8;
function lineOffset(depth: number) {
  return depth <= 2 ? BASE : depth === 3 ? 8 + BASE : 16 + BASE;
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
        style={{ paddingInlineStart: entry.depth <= 2 ? 20 : entry.depth === 3 ? 32 : 44 }}
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

function GitHub() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
