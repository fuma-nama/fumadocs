'use client';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { type Mode, modes } from '@/utils/modes';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import { useSidebar } from 'fumadocs-ui/provider';

export function SidebarBanner(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const { rootId, setRootId } = useSidebar();
  const currentMode = modes.find((item) => item.param === rootId) ?? modes[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="-mx-2 flex flex-row items-center gap-2 rounded-lg p-2 hover:bg-muted">
        <Item mode={currentMode} />
        <ChevronDown className="size-4 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="p-1">
        {modes.map((item) => (
          <button
            key={item.param}
            onClick={() => {
              setRootId(item.param);
              setOpen(false);
            }}
            className={cn(
              'flex flex-row gap-2 rounded-lg p-2 w-full',
              currentMode.param === item.param
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50',
            )}
          >
            <Item mode={item} />
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function Item({ mode }: { mode: Mode }): React.ReactElement {
  const Icon = mode.icon;

  return (
    <>
      <Icon
        className="size-9 shrink-0 rounded-md bg-gradient-to-t from-background/80 p-1.5"
        style={{
          backgroundColor: `hsl(var(--${mode.param}-color)/.3)`,
          color: `hsl(var(--${mode.param}-color))`,
        }}
      />
      <div className="flex-1 text-left">
        <p className="text-xs">
          <span className="font-medium">{mode.name}</span>
          <span className="ml-2 text-muted-foreground">{mode.version}</span>
        </p>
        <p className="text-xs text-muted-foreground">{mode.description}</p>
      </div>
    </>
  );
}
