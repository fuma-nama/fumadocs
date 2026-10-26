import type { ReactNode } from 'react';
import { TopLinks } from './links';

export interface ScreenProps {
  title?: string;
  /** the page of the docs this demo comes from */
  docs: string;
}

/** one screen of a demo: the page's title over its content, nothing scrolls */
export function Screen({ title, docs, children }: ScreenProps & { children: ReactNode }) {
  return (
    <main className="@container flex h-dvh flex-col overflow-hidden bg-fd-background px-4 py-5 text-fd-foreground sm:px-6 sm:py-6">
      <h1 className="mb-3 text-xl font-semibold @sm:mb-4 @sm:text-[1.375rem]">{title}</h1>
      <div className="prose min-h-0 flex-1 text-sm">{children}</div>
      <TopLinks docs={docs} />
    </main>
  );
}
