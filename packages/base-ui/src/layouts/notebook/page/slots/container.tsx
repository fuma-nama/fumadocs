'use client';
import type { ComponentProps } from 'react';
import { useDocsPage } from '..';
import { cn } from '@/utils/cn';

export function Container(props: ComponentProps<'article'>) {
  const {
    props: { full },
  } = useDocsPage();

  return (
    <article
      id="nd-page"
      data-full={full}
      {...props}
      className={cn(
        'flex flex-col [grid-area:main] px-4 py-6 gap-4 md:px-6 md:pt-8 xl:px-8 xl:pt-14 *:max-w-[900px]',
        full && '*:max-w-[1285px]',
        props.className,
      )}
    >
      {props.children}
    </article>
  );
}
