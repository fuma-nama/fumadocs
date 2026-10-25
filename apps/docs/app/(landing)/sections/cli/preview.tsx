import { Search } from 'lucide-react';
import { Banner } from 'fumadocs-ui/components/banner';
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
 * The template's first page in the docs layout. Title, description and banner are the real
 * components; the chrome mirrors the markup of `fumadocs-ui/layouts/docs`, its links plain text.
 * Your edits apply as the classes they produce, `cn` merges them the same way.
 */
export function Preview({ title, banner }: PreviewProps) {
  return (
    <div className="isolate bg-fd-background text-[13px] text-fd-foreground">
      {banner !== undefined && (
        // static: the page doesn't scroll inside the preview
        <Banner changeLayout={false} className={cn('static z-0', banner)}>
          Hello World
        </Banner>
      )}
      <div className="grid grid-cols-[38%_minmax(0,1fr)]">
        <div className="flex flex-col gap-2 border-e bg-fd-card p-2">
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
        <article className="flex flex-col px-5 pt-8 pb-6">
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
        </article>
      </div>
    </div>
  );
}
