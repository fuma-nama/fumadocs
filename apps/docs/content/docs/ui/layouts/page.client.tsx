'use client';
import { createContext, type MouseEvent, type ReactNode, use, useRef, useState } from 'react';
import { Text } from 'lucide-react';
import type { TOCItemType } from 'fumadocs-core/toc';
import { TOCProvider, TOCScrollArea } from 'fumadocs-ui/components/toc';
import * as TocDefault from 'fumadocs-ui/components/toc/default';
import * as TocClerk from 'fumadocs-ui/components/toc/clerk';
import * as TocBlock from 'fumadocs-ui/components/toc/block';
import { cn } from '@/lib/cn';

const variants = { normal: TocDefault, clerk: TocClerk, block: TocBlock };

type Style = keyof typeof variants;

const toc: TOCItemType[] = [
  { title: 'Introduction', url: '#toc-preview-introduction', depth: 2 },
  { title: 'Installation', url: '#toc-preview-installation', depth: 2 },
  { title: 'Configuration', url: '#toc-preview-configuration', depth: 3 },
  { title: 'Plugins', url: '#toc-preview-plugins', depth: 4 },
  { title: 'Usage', url: '#toc-preview-usage', depth: 2 },
  { title: 'Components', url: '#toc-preview-components', depth: 3 },
  { title: 'Styling', url: '#toc-preview-styling', depth: 3 },
  { title: 'FAQ', url: '#toc-preview-faq', depth: 2 },
];

const lineWidths = ['w-full', 'w-11/12', 'w-4/5', 'w-2/3'];

const StyleContext = createContext<{
  style: Style;
  setStyle: (style: Style) => void;
} | null>(null);

/** rows of `TOCStyle` as children */
export function TOCStylePreview({ children }: { children: ReactNode }) {
  const [style, setStyle] = useState<Style>('normal');
  const articleRef = useRef<HTMLDivElement>(null);
  const { TOCItems, TOCItem } = variants[style];

  // scroll the preview only, instead of navigating the page
  const onClickItem = (e: MouseEvent<HTMLAnchorElement>) => {
    const article = articleRef.current;
    const heading = document.getElementById(e.currentTarget.hash.slice(1));
    if (!article || !heading) return;

    e.preventDefault();
    article.scrollTo({ top: heading.offsetTop - 16, behavior: 'smooth' });
  };

  return (
    <TOCProvider toc={toc}>
      <div className="not-prose flex flex-col rounded-lg border bg-fd-background">
        <div className="flex flex-col border-b p-1.5 gap-0.5">
          <StyleContext value={{ style, setStyle }}>{children}</StyleContext>
        </div>
        <div className="grid sm:h-80 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <div
            ref={articleRef}
            className="relative flex flex-col gap-3 overflow-y-auto overscroll-contain p-4 max-sm:h-64"
          >
            {toc.map((item, i) => (
              <section key={item.url} className="flex flex-col gap-2 not-first:mt-3">
                <p
                  id={item.url.slice(1)}
                  className={cn('font-medium', item.depth <= 2 ? 'text-base' : 'text-sm')}
                >
                  {item.title}
                </p>
                {lineWidths.slice(i % 2).map((width) => (
                  <div key={width} className={cn('h-2 rounded-full bg-fd-foreground/10', width)} />
                ))}
              </section>
            ))}
          </div>
          <div className="flex min-h-0 flex-col p-4 max-sm:border-t sm:border-s">
            <p className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground">
              <Text className="size-4" />
              On this page
            </p>
            <TOCScrollArea>
              <TOCItems>
                {toc.map((item) => (
                  <TOCItem key={item.url} item={item} onClick={onClickItem} />
                ))}
              </TOCItems>
            </TOCScrollArea>
          </div>
        </div>
      </div>
    </TOCProvider>
  );
}

export function TOCStyle({ value, children }: { value: Style; children: ReactNode }) {
  const { style, setStyle } = use(StyleContext)!;
  const active = style === value;

  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'grid grid-cols-[60px_1fr] text-start text-xs text-fd-muted-foreground px-2 py-1.5 rounded-md',
        active ? 'text-fd-primary bg-fd-primary/10' : 'hover:bg-fd-accent',
      )}
      onClick={() => setStyle(value)}
    >
      <span className="font-mono">{value}</span>
      <div
        className={cn(
          '[&_a]:relative [&_a]:text-fd-foreground [&_a]:underline [&_a]:underline-offset-2',
          active && 'text-fd-primary/60',
        )}
      >
        {children}
      </div>
    </button>
  );
}
