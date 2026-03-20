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
        'flex flex-col w-full max-w-[900px] mx-auto [grid-area:main] px-4 py-6 gap-4 md:px-6 md:pt-8 xl:px-8 xl:pt-14',
        full ? 'max-w-[1168px]' : 'xl:layout:[--fd-toc-width:268px]',
        props.className,
      )}
    >
      {props.children}
    </article>
  );
}
