import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { itemVariants } from '@/components/layout/variants';
import { BaseLinkItem, ButtonItem, LinkItemType } from '@/layouts/links';

interface MenuItemProps extends React.HTMLAttributes<HTMLElement> {
  item: LinkItemType;
}

export function MenuItem({ item, ...props }: MenuItemProps): ReactNode {
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
