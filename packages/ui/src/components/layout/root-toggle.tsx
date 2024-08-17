'use client';
import { ChevronDown } from 'lucide-react';
import { type ReactNode, useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';
import { isActive } from '@/utils/shared';
import { useSidebar } from '@/contexts/sidebar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface Option {
  /**
   * Redirect URL of the folder, usually the index page
   */
  url: string;

  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
}

export function RootToggle({
  options,
}: {
  options: Option[];
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const { closeOnRedirect } = useSidebar();
  const pathname = usePathname();
  const selected =
    options.find((item) => isActive(item.url, pathname, true)) ?? options[0];

  const onClick = useCallback(() => {
    closeOnRedirect.current = false;
    setOpen(false);
  }, [closeOnRedirect]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="-mx-2 flex flex-row items-center gap-2.5 rounded-lg p-2 hover:bg-fd-muted">
        <Item {...selected} />
        <ChevronDown className="size-4 text-fd-muted-foreground md:me-1.5" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] overflow-hidden p-0">
        {options.map((item) => (
          <Link
            key={item.url}
            href={item.url}
            onClick={onClick}
            className={cn(
              'flex w-full flex-row gap-2 p-2',
              selected === item
                ? 'bg-fd-accent text-fd-accent-foreground'
                : 'hover:bg-fd-accent/50',
            )}
          >
            <Item {...item} />
          </Link>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function Item({ title, icon, description }: Option): React.ReactElement {
  return (
    <>
      {icon}
      <div className="flex-1 text-left">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-fd-muted-foreground">{description}</p>
      </div>
    </>
  );
}
