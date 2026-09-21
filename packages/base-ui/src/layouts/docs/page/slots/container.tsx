'use client';

import type { ComponentProps } from 'react';
import { useDocsPage } from '..';
import { cn } from '@/utils/cn';

export function Container(props: ComponentProps<'article'>) {
  const { full } = useDocsPage();

  return (
    <main className="grid [grid-area:main] justify-items-center" data-layout-main="">
      <article
        id="nd-page"
        data-layout-content=""
        data-full={full}
        {...props}
        className={cn(
          'flex flex-col min-w-0 w-full max-w-[900px] px-4 py-6 gap-4 md:px-6 md:pt-8 xl:px-8 xl:pt-14',
          // with the sidebar collapsed, its reopen/search controls float in a fixed
          // pill at the top-left of this row; unless the article is centered with
          // room to spare, the pill sits on the title, so reserve its band
          'md:in-data-[sidebar-collapsed=true]:pt-16 xl:in-data-[sidebar-collapsed=true]:pt-16',
          full && 'max-w-[1168px]',
          props.className,
        )}
      >
        {props.children}
      </article>
    </main>
  );
}
