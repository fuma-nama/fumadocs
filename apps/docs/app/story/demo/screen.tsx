'use client';
import { type ReactNode, useEffect } from 'react';

interface ScreenProps {
  title?: string;
  /** the page of the docs this demo comes from */
  docs: string;
  children: ReactNode;
}

/**
 * One screen of a demo, framed in the landing: the page's title over its content, nothing scrolls.
 * A link leads the whole page instead of the frame, and a place on the demo leads to the same place
 * on its docs page.
 */
export function Screen({ title, docs, children }: ScreenProps) {
  useEffect(() => {
    const top = window.top;
    if (!top || top === window) return;
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      const link = (event.target as Element).closest('a[href]');
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || link.download) return;
      const url = new URL(link.href);
      const here = url.origin === location.origin && url.pathname === location.pathname;
      // before the framework's router sees the click
      event.preventDefault();
      top.location.assign(here ? new URL(docs + url.hash, location.origin) : url);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [docs]);

  return (
    <main className="@container flex h-dvh flex-col overflow-hidden bg-fd-background px-4 py-5 text-fd-foreground sm:px-6 sm:py-6">
      <h1 className="mb-3 text-xl font-semibold @sm:mb-4 @sm:text-[1.375rem]">{title}</h1>
      <div className="prose min-h-0 flex-1 text-sm">{children}</div>
    </main>
  );
}
