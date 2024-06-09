'use client';
import { ChevronDown } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';
import { isActive } from '@/utils/shared';
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
  const pathname = usePathname();
  const selected =
    options.find((item) => isActive(item.url, pathname, true)) ?? options[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="-mx-2 flex flex-row items-center gap-2 rounded-lg p-2 hover:bg-muted">
        <Item {...selected} />
        <ChevronDown className="size-4 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] overflow-hidden p-0">
        {options.map((item) => (
          <Link
            key={item.url}
            href={item.url}
            onClick={() => {
              setOpen(false);
            }}
            className={cn(
              'flex w-full flex-row gap-2 p-2',
              selected === item
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50',
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
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </>
  );
}
