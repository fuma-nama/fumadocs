'use client';

import { ChevronDown } from 'lucide-react';
import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import { cn } from '@/utils/cn';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { BaseLinkItem, type LinkItemType } from '@/layouts/links';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cva } from 'class-variance-authority';
import { buttonVariants } from '@/components/ui/button';
import { useSidebar } from '@/contexts/sidebar';

export function LayoutBody(props: HTMLAttributes<HTMLElement>) {
  const { collapsed } = useSidebar();

  return (
    <main
      {...props}
      className={cn(
        !collapsed &&
          '[&_#nd-page]:max-w-[calc(min(100vw,var(--fd-layout-width))-var(--fd-sidebar-width)-var(--fd-toc-width))]',
        props.className,
      )}
    >
      {props.children}
    </main>
  );
}

const itemVariants = cva(
  'flex flex-row items-center gap-2 rounded-md px-3 py-2.5 text-fd-muted-foreground transition-colors duration-100 [overflow-wrap:anywhere] hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none md:px-2 md:py-1.5 [&_svg]:size-4',
);

interface LinksMenuProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  items: LinkItemType[];
}

export function LinksMenu({ items, ...props }: LinksMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useOnChange(pathname, () => {
    setOpen(false);
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger {...props} />
      <PopoverContent className="flex flex-col p-1">
        {items.map((item, i) => (
          <MenuItem key={i} item={item} />
        ))}
      </PopoverContent>
    </Popover>
  );
}

interface MenuItemProps extends HTMLAttributes<HTMLElement> {
  item: LinkItemType;
}

export function MenuItem({ item, ...props }: MenuItemProps) {
  if (item.type === 'custom')
    return (
      <div {...props} className={cn('grid', props.className)}>
        {item.children}
      </div>
    );

  if (item.type === 'menu') {
    return (
      <Collapsible className="flex flex-col">
        <CollapsibleTrigger
          {...props}
          className={cn(itemVariants(), 'group', props.className)}
        >
          {item.icon}
          {item.text}
          <ChevronDown className="ms-auto transition-transform group-data-[state=closed]:-rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col py-2 ps-2">
            {item.items.map((child, i) => (
              <MenuItem key={i} item={child} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <BaseLinkItem
      item={item}
      {...props}
      className={cn(
        item.type === 'button'
          ? buttonVariants({
              color: 'secondary',
              className: 'gap-1.5 [&_svg]:size-4',
            })
          : itemVariants(),
        props.className,
      )}
    >
      {item.icon}
      {item.text}
    </BaseLinkItem>
  );
}
