import type { ReactNode } from 'react';
import { CpuIcon, DatabaseIcon, Menu, PanelsTopLeftIcon, Search, TerminalIcon } from 'lucide-react';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { DocsBody, DocsDescription } from 'fumadocs-ui/layouts/docs/page';
import { cn } from '@/lib/cn';

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

/**
 * The top of fumadocs.dev's Quick Start in the default docs layout, at the width of the face it
 * lies on, which is a phone's: the navbar, then the page. The content is the real components; the
 * navbar mirrors the markup of `fumadocs-ui/layouts/docs`, whose providers need a full page.
 */
export function DocsPreview() {
  const cards: ReactNode[] = [];
  for (const layer of layers)
    cards.push(
      <Card key={layer.title} icon={layer.icon} title={layer.title}>
        {layer.text}
      </Card>,
    );

  return (
    <div className="flex size-full flex-col bg-fd-background text-fd-foreground">
      <div className="flex h-14 shrink-0 items-center gap-1 border-b px-4">
        <span className="me-auto inline-flex items-center gap-2.5 text-[0.9375rem] font-medium">
          <span className="size-5 rounded-full border bg-fd-primary" />
          Fumadocs
        </span>
        <span className={navButton}>
          <Search />
        </span>
        <span className={navButton}>
          <Menu />
        </span>
      </div>
      <article className="flex min-w-0 flex-col px-4 pt-6">
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
        </DocsBody>
      </article>
    </div>
  );
}

/** the same page on a UI of your own: what `fumadocs-core` hands over, as plain elements */
export function HeadlessPreview() {
  const list: ReactNode[] = [];
  for (const layer of layers)
    list.push(
      <li key={layer.title}>
        <span className="font-semibold">{layer.title}</span>: {layer.text}
      </li>,
    );

  return (
    <div className="flex size-full flex-col gap-4 bg-lp-paper px-4 pt-5 text-base leading-normal text-lp-ink">
      <p className="flex justify-between">
        <span className="font-semibold">Fumadocs</span>
        <span className="underline underline-offset-2">Menu</span>
      </p>
      <p className="text-[2em] leading-tight font-bold">Quick Start</p>
      <p>Getting Started with Fumadocs</p>
      <p className="mt-2 text-[1.5em] font-bold">Introduction</p>
      <p>
        Fumadocs (Foo-ma docs) is a documentation framework, designed to be fast, flexible, and
        composes seamlessly into your React framework. It consists of multiple layers:
      </p>
      <ul className="list-disc ps-5">{list}</ul>
    </div>
  );
}
