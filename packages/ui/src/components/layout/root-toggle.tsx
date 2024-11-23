'use client';
import { ChevronDown } from 'lucide-react';
import { type HTMLAttributes, type ReactNode, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';
import { isActive } from '@/utils/is-active';
import { useSidebar } from '@/contexts/sidebar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import type { PageTree } from 'fumadocs-core/server';
import { useTreePath } from '@/contexts/tree';

export interface Option {
  /**
   * Redirect URL of the folder, usually the index page
   */
  url: string;

  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;

  /**
   * Detect from page tree nodes
   */
  folder?: PageTree.Folder;

  props?: HTMLAttributes<HTMLElement>;
}

export function RootToggle({
  options,
  ...props
}: {
  options: Option[];
} & HTMLAttributes<HTMLButtonElement>) {
  const [open, setOpen] = useState(false);
  const { closeOnRedirect } = useSidebar();
  const pathname = usePathname();
  const path = useTreePath();

  const selected = useMemo(() => {
    return options.findLast((item) =>
      item.folder
        ? path.includes(item.folder)
        : isActive(item.url, pathname, true),
    );
  }, [path, options, pathname]);

  const onClick = () => {
    closeOnRedirect.current = false;
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        {...props}
        className={cn(
          'flex flex-row items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-fd-accent/50 hover:text-fd-accent-foreground',
          props.className,
        )}
      >
        {selected ? <Item {...selected} /> : null}

        <ChevronDown className="me-1.5 size-4 text-fd-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] overflow-hidden p-0">
        {options.map((item) => (
          <Link
            key={item.url}
            href={item.url}
            onClick={onClick}
            {...item.props}
            className={cn(
              'flex w-full flex-row items-center gap-2 px-2 py-1.5',
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

function Item(props: Option) {
  return (
    <>
      {props.icon}
      <div className="flex-1 text-start">
        <p className="text-sm font-medium">{props.title}</p>
        {props.description ? (
          <p className="text-xs text-fd-muted-foreground">
            {props.description}
          </p>
        ) : null}
      </div>
    </>
  );
}
