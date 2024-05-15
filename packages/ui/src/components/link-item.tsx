import Link from 'fumadocs-core/link';
import { ChevronDownIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cva } from 'class-variance-authority';
import type { LinkItemType } from '@/layout';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import { isActive } from '@/utils/shared';
import { buttonVariants } from '@/theme/variants';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const linkItemVariants = cva(
  'inline-flex items-center gap-1.5 rounded-lg p-2 text-[15px] text-muted-foreground transition-colors [&_svg]:size-4',
  {
    variants: {
      active: {
        true: 'bg-accent text-accent-foreground',
        false: 'hover:bg-accent',
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

interface LinkItemProps extends React.HTMLAttributes<HTMLElement> {
  item: LinkItemType;
  on?: 'menu' | 'nav';
}

export function LinkItem({
  item,
  on = 'nav',
  className,
  ...props
}: LinkItemProps): React.ReactElement {
  const pathname = usePathname();

  if (item.type === 'menu' && on === 'nav') {
    return (
      <Popover>
        <PopoverTrigger
          className={cn(
            linkItemVariants({ className }),
            'data-[state=open]:bg-accent',
          )}
          {...props}
        >
          {item.text}
          <ChevronDownIcon className="ml-auto size-4" />
        </PopoverTrigger>
        <PopoverContent className="flex flex-col">
          {item.items.map((child, i) => (
            <LinkItem key={i} item={child} on="menu" />
          ))}
        </PopoverContent>
      </Popover>
    );
  }

  if (item.type === 'menu') {
    return (
      <Collapsible className="flex flex-col">
        <CollapsibleTrigger
          className={cn(linkItemVariants({ className }))}
          {...props}
        >
          {item.icon}
          {item.text}
          <ChevronDownIcon className="ml-auto size-4" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col ps-4 pt-2">
            {item.items.map((child, i) => (
              <LinkItem key={i} item={child} on="menu" />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  const activeType = item.active ?? 'url';
  const active =
    activeType !== 'none'
      ? isActive(item.url, pathname, activeType === 'nested-url')
      : false;

  if (item.type === 'secondary' && on === 'nav') {
    return (
      <Link
        aria-label={item.text}
        href={item.url}
        external={item.external}
        className={cn(
          buttonVariants({
            size: 'icon',
            color: 'ghost',
            className,
          }),
        )}
        {...props}
      >
        {item.icon}
      </Link>
    );
  }

  return (
    <Link
      href={item.url}
      external={item.external}
      className={cn(
        linkItemVariants({
          active,
          className,
        }),
      )}
      {...props}
    >
      {on === 'menu' ? item.icon : null}
      {item.text}
    </Link>
  );
}
