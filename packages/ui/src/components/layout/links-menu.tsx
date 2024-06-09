import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/theme/variants';
import { LinkItem } from '@/components/layout/link-item';
import type { LinkItemType } from '@/layout';

interface LinksMenuProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  items: LinkItemType[];
  enabledTheme?: boolean;
}

export function LinksMenu({
  items,
  ...props
}: LinksMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        {...props}
        className={cn(
          buttonVariants({
            size: 'icon',
            color: 'ghost',
            className: props.className,
          }),
        )}
      >
        <MoreHorizontal />
      </PopoverTrigger>
      <PopoverContent className="flex flex-col">
        {items.map((item, i) => (
          <LinkItem key={i} item={item} on="menu" />
        ))}
        {props.children}
      </PopoverContent>
    </Popover>
  );
}
