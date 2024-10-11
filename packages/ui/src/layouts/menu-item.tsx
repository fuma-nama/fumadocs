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
  key?: string | number;
  item: LinkItemType;
}

export function renderMenuItem({
  key,
  item,
  ...props
}: MenuItemProps): ReactNode {
  if (item.type === 'custom')
    return (
      <div key={key} {...props} className={cn('grid', props.className)}>
        {item.children}
      </div>
    );

  if (item.type === 'menu') {
    return (
      <Collapsible key={key} className="flex flex-col">
        <CollapsibleTrigger
          {...props}
          className={cn(itemVariants(), props.className, 'group/link')}
        >
          {item.icon}
          {item.text}
          <ChevronDown className="ms-auto transition-transform group-data-[state=closed]/link:-rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ms-2 flex flex-col border-s py-2 ps-2">
            {item.items.map((child, i) =>
              renderMenuItem({ key: i, item: child }),
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  if (item.type === 'button') {
    return <ButtonItem key={key} item={item} {...props} />;
  }

  return (
    <BaseLinkItem
      key={key}
      item={item}
      {...props}
      className={cn(itemVariants(), props.className)}
    >
      {item.icon}
      {item.text}
    </BaseLinkItem>
  );
}
