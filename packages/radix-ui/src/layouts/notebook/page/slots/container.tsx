'use client';

import type { ComponentProps } from 'react';
import { useDocsPage } from '..';
import { cn } from '@/utils/cn';

export function Container(props: ComponentProps<'article'>) {
  const { full } = useDocsPage();

  return (
    <main className="grid [grid-area:main]" data-layout-main="">
      <article
        id="nd-page"
        data-layout-content=""
        data-full={full}
        {...props}
        className={cn(
          'flex flex-col min-w-0 px-4 py-6 gap-4 md:px-6 md:pt-8 xl:px-8 xl:pt-14 *:max-w-[900px]',
          full && '*:max-w-[1285px]',
          props.className,
        )}
      >
        {props.children}
      </article>
    </main>
  );
}
