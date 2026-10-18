'use client';
import type { ReactNode } from 'react';
import { Popover } from '@base-ui/react/popover';
import { cn } from '@/utils/cn';

/** a value like `@auth(requires: USER)` or an enum value, like the tags of Schema UI */
export const chipClassName =
  'rounded-md border bg-fd-secondary px-1.5 py-0.5 font-mono text-xs text-fd-secondary-foreground';

/** Markdown in the details */
export const detailsMarkdownClassName =
  'text-xs leading-relaxed text-fd-muted-foreground prose-no-margin [&_a]:underline [&_code]:font-mono';

/** a chip opening its `details` on hover, click or keyboard */
export function DetailsPopover({
  details,
  className,
  children,
}: {
  details: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={200}
        closeDelay={100}
        className={cn(
          chipClassName,
          'transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring data-popup-open:bg-fd-accent data-popup-open:text-fd-accent-foreground',
          className,
        )}
      >
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
          <Popover.Popup className="w-max max-w-[min(18rem,calc(100vw-2rem))] origin-(--transform-origin) rounded-xl border bg-fd-popover p-3 text-fd-popover-foreground shadow-lg outline-none transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
            {details}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
