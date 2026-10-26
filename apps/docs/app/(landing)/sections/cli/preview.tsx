import { Search, SidebarIcon, Text } from 'lucide-react';
import { Banner } from 'fumadocs-ui/components/banner';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { DocsDescription, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { cn } from '@/lib/cn';

// classes of `layouts/docs/slots/sidebar.tsx`
const item =
  'relative flex flex-row items-center gap-2 rounded-lg p-2 text-start text-fd-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0';

export interface PreviewProps {
  /** the class your copy of `DocsTitle` adds */
  title?: string;
  /** your copy of `Banner` over the page, as its docs place it, with the class your copy adds */
  banner?: string;
}

/**
 * The template's first page in the docs layout, `content/docs/index.mdx` as it is. Title,
 * description, cards and banner are the real components; the chrome mirrors the markup of
 * `fumadocs-ui/layouts/docs`, its links plain text: on a phone the header with search and the
 * sidebar's trigger; from 768px the sidebar, and the table of contents once the page is wide. Your
 * edits apply as the classes they produce, `cn` merges them the same way.
 */
export function Preview({ title, banner }: PreviewProps) {
  return (
    <div className="@container isolate flex h-full flex-col bg-fd-background text-[13px] text-fd-foreground">
      {banner !== undefined && (
        // static: the page doesn't scroll inside the preview
        <Banner changeLayout={false} className={cn('static z-0', banner)}>
          Hello World
        </Banner>
      )}
      {/* classes of `layouts/docs/slots/header.tsx` */}
      <div className="flex h-12 items-center border-b ps-4 pe-2.5 md:hidden">
        <p className="flex-1 font-semibold">My App</p>
        <span className="p-2 text-fd-muted-foreground [&_svg]:size-4">
          <Search />
        </span>
        <span className="p-2 text-fd-muted-foreground [&_svg]:size-4">
          <SidebarIcon />
        </span>
      </div>
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] md:grid-cols-[38%_minmax(0,1fr)] md:@xl:grid-cols-[180px_minmax(0,1fr)] md:@3xl:grid-cols-[190px_minmax(0,1fr)_170px]">
        <div className="hidden flex-col gap-2 border-e bg-fd-card p-2 md:flex">
          <p className="px-2 pt-1 font-medium">My App</p>
          <p className="flex items-center gap-2 rounded-lg border bg-fd-secondary/50 p-1.5 text-fd-muted-foreground [&_svg]:size-3.5">
            <Search />
            Search
          </p>
          <div className="flex flex-col">
            <span className={cn(item, 'bg-fd-primary/10 text-fd-primary')}>Hello World</span>
            <span className={item}>Components</span>
          </div>
        </div>
        <article className="flex flex-col px-4 py-6 md:px-5 md:pt-8 md:@xl:px-8">
          {/* a heading inside the figure's own */}
          <DocsTitle aria-level={3} className={title}>
            Hello World
          </DocsTitle>
          <DocsDescription className="mb-4 text-[1.1em]">Your first document</DocsDescription>
          <p className="text-fd-muted-foreground">
            Welcome to the docs! You can start writing documents in{' '}
            <code className="rounded-md border bg-fd-muted p-0.5 text-[0.85em]">/content/docs</code>
            .
          </p>
          <p role="heading" aria-level={4} className="mt-6 mb-3 text-[1.2em] font-semibold">
            What is Next?
          </p>
          <Cards>
            <Card title="Learn more about Next.js" />
            <Card title="Learn more about Fumadocs" />
          </Cards>
        </article>
        <div className="hidden flex-col gap-3 pt-8 pe-4 md:@3xl:flex">
          <p className="inline-flex items-center gap-1.5 text-fd-muted-foreground [&_svg]:size-3.5">
            <Text />
            On this page
          </p>
          <p className="border-s ps-3 text-fd-primary">What is Next?</p>
        </div>
      </div>
    </div>
  );
}
