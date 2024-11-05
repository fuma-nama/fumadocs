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
import { BaseLinkItem, ButtonItem, type LinkItemType } from '@/layouts/links';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { itemVariants } from '@/components/layout/variants';

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
        {items?.map((item, i) => <MenuItem key={i} item={item} />)}
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
          data-active={false}
          className={cn(itemVariants(), 'group/link', props.className)}
        >
          {item.icon}
          {item.text}
          <ChevronDown className="ms-auto transition-transform group-data-[state=closed]/link:-rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ms-2 flex flex-col border-s py-2 ps-2">
            {item.items.map((child, i) => (
              <MenuItem key={i} item={child} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  if (item.type === 'button') {
    return <ButtonItem item={item} {...props} />;
  }

  return (
    <BaseLinkItem
      item={item}
      {...props}
      className={cn(itemVariants(), props.className)}
    >
      {item.icon}
      {item.text}
    </BaseLinkItem>
  );
}
