'use client';

import type { ComponentProps } from 'react';
import { cn } from '@/utils/cn';
import { useDocsPage } from '..';

export function Container(props: ComponentProps<'article'>) {
  const { full } = useDocsPage();

  return (
    <main className="grid [grid-area:main] justify-items-center">
      <article
        id="nd-page"
        data-full={full}
        {...props}
        className={cn(
          'flex flex-col w-full max-w-[900px] px-4 py-6 gap-4 md:px-6 md:pt-8 xl:px-8 xl:pt-14',
          full && 'max-w-[1200px]',
          props.className,
        )}
      >
        {props.children}
      </article>
    </main>
  );
}
