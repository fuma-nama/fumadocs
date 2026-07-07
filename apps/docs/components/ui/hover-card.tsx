'use client';

import type { ComponentProps } from 'react';
import { PreviewCard as PreviewCardPrimitive } from '@base-ui/react/preview-card';
import { cn } from '@/lib/cn';
import Link from 'fumadocs-core/link';

const HoverCard = PreviewCardPrimitive.Root;

function HoverCardTrigger(props: ComponentProps<typeof Link>) {
  return <PreviewCardPrimitive.Trigger render={<Link {...props} />} />;
}

function HoverCardContent({
  className,
  align = 'center',
  sideOffset = 4,
  ...props
}: ComponentProps<typeof PreviewCardPrimitive.Popup> &
  Pick<ComponentProps<typeof PreviewCardPrimitive.Positioner>, 'align' | 'sideOffset'>) {
  return (
    <PreviewCardPrimitive.Portal>
      <PreviewCardPrimitive.Positioner align={align} sideOffset={sideOffset} className="z-50">
        <PreviewCardPrimitive.Popup
          className={cn(
            'w-72 rounded-lg border bg-fd-popover p-4 text-popover-fd-foreground shadow-md outline-none origin-(--transform-origin) data-open:animate-fd-popover-in data-closed:animate-fd-popover-out',
            className,
          )}
          {...props}
        />
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardTrigger, HoverCardContent };
