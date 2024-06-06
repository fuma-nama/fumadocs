'use client';
import { ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { type ReactNode, useState } from 'react';
import { useSidebar } from '@/contexts/sidebar';
import { useTreeContext } from '@/contexts/tree';
import { cn } from '@/utils/cn';

interface Option {
  /**
   * ID of the folder, usually equal to the relative pathname
   */
  id: string;

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
  const { root } = useTreeContext();
  const { rootId = 'type' in root ? root.id : undefined, setRootId } =
    useSidebar();
  const selected = options.find((item) => item.id === rootId) ?? options[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="-mx-2 flex flex-row items-center gap-2 rounded-lg p-2 hover:bg-muted">
        <Item {...selected} />
        <ChevronDown className="size-4 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="p-1 w-[var(--radix-popover-trigger-width)]">
        {options.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setRootId(item.id);
              setOpen(false);
            }}
            className={cn(
              'flex flex-row gap-2 rounded-lg p-2 w-full',
              selected.id === item.id
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50',
            )}
          >
            <Item {...item} />
          </button>
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
