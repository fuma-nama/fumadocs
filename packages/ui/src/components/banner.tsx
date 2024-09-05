'use client';

import { type HTMLAttributes, useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/theme/variants';

export function Banner({
  id,
  changeLayout = true,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  /**
   * Change Fumadocs layout styles
   *
   * @defaultValue true
   */
  changeLayout?: boolean;
}): React.ReactElement {
  const [open, setOpen] = useState(true);
  const globalKey = id ? `nd-banner-${id}` : undefined;

  useEffect(() => {
    if (globalKey) setOpen(localStorage.getItem(globalKey) !== 'true');
  }, [globalKey]);

  const onClick = useCallback(() => {
    setOpen(false);
    if (globalKey) localStorage.setItem(globalKey, 'true');
  }, [globalKey]);

  return (
    <div
      id={id}
      {...props}
      className={cn(
        'sticky top-0 z-40 flex h-12 flex-row items-center justify-center bg-fd-secondary px-4 text-center text-sm font-medium',
        props.className,
      )}
      suppressHydrationWarning
    >
      {changeLayout && open ? (
        <style>{`
        .not_${globalKey} #nd-sidebar, .not_${globalKey} #nd-nav, .not_${globalKey} #nd-subnav, .not_${globalKey} [data-toc] { top: 3rem; }
        .not_${globalKey} #nd-tocnav { top: 6.5rem; }
        .not_${globalKey} #nd-sidebar, .not_${globalKey} [data-toc] { height: calc(100dvh - 3rem); }
        `}</style>
      ) : null}
      <style>{`.${globalKey} #${id} { display: none; }`}</style>
      {id ? (
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add(
            localStorage.getItem('${globalKey}') === 'true'? '${globalKey}' : 'not_${globalKey}'
           )`,
          }}
        />
      ) : null}
      {props.children}
      {id ? (
        <button
          type="button"
          aria-label="Close Banner"
          onClick={onClick}
          className={cn(
            buttonVariants({
              color: 'ghost',
              className:
                'absolute end-2 top-1/2 -translate-y-1/2 text-fd-muted-foreground',
              size: 'icon',
            }),
          )}
        >
          <X />
        </button>
      ) : null}
    </div>
  );
}
