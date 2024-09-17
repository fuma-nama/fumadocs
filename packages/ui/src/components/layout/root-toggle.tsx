'use client';
import { ChevronDown } from 'lucide-react';
import { HTMLAttributes, type ReactNode, useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';
import { isActive } from '@/utils/shared';
import { useSidebar } from '@/contexts/sidebar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

export interface Option {
  /**
   * Redirect URL of the folder, usually the index page
   */
  url: string;

  icon?: ReactNode;
  title: ReactNode;
  description: ReactNode;

  props?: HTMLAttributes<HTMLElement>;
}

export function RootToggle({
  options,
  ...props
}: {
  options: Option[];
} & HTMLAttributes<HTMLButtonElement>): React.ReactElement {
  const [open, setOpen] = useState(false);
  const { closeOnRedirect } = useSidebar();
  const pathname = usePathname();
  const selected = options.find((item) => isActive(item.url, pathname, true));

  const onClick = useCallback(() => {
    closeOnRedirect.current = false;
    setOpen(false);
  }, [closeOnRedirect]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        {...props}
        {...selected?.props}
        className={cn(
          '-mx-1 flex flex-row items-center gap-2.5 rounded-lg p-1 hover:bg-fd-accent/50 hover:text-fd-accent-foreground',
          props.className,
          selected?.props?.className,
        )}
      >
        {selected ? <Item {...selected} /> : null}

        <ChevronDown className="size-4 text-fd-muted-foreground md:me-1.5" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] overflow-hidden p-0">
        {options.map((item) => (
          <Link
            key={item.url}
            href={item.url}
            onClick={onClick}
            {...item.props}
            className={cn(
              'flex w-full flex-row items-center gap-2.5 p-2',
              selected === item
                ? 'bg-fd-accent text-fd-accent-foreground'
                : 'hover:bg-fd-accent/50',
              item.props?.className,
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
