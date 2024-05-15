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

const linkItemVariants = cva(
  'inline-flex items-center gap-1.5 rounded-lg p-2 text-base text-muted-foreground transition-colors data-[state=open]:bg-accent [&_svg]:size-4',
  {
    variants: {
      active: {
        true: 'bg-accent text-accent-foreground',
        false: 'hover:bg-accent',
      },
    },
  },
);

interface LinkItemProps extends React.HTMLAttributes<HTMLElement> {
  item: LinkItemType;
  showIcon?: boolean;
}

export function LinkItem({
  item,
  showIcon = false,
  className,
  ...props
}: LinkItemProps): React.ReactElement {
  const pathname = usePathname();

  if (item.type === 'menu') {
    return (
      <Popover>
        <PopoverTrigger
          className={cn(linkItemVariants({ active: false, className }))}
          {...props}
        >
          {showIcon ? item.icon : null}
          {item.text}
          <ChevronDownIcon className="ml-auto size-4" />
        </PopoverTrigger>
        <PopoverContent className="flex flex-col">
          {item.items.map((child, i) => (
            <LinkItem key={i} item={child} />
          ))}
        </PopoverContent>
      </Popover>
    );
  }

  const activeType = item.active ?? 'url';
  const active =
    activeType !== 'none'
      ? isActive(item.url, pathname, activeType === 'nested-url')
      : false;

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
      {showIcon ? item.icon : null}
      {item.text}
    </Link>
  );
}
