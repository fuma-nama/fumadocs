'use client';
import { Check, ChevronsUpDown } from 'lucide-react';
import { type ComponentProps, type ReactNode, useMemo, useState } from 'react';
import Link from 'fumadocs-core/link';
import { usePathname } from 'fumadocs-core/framework';
import { cn } from '@/utils/cn';
import { isActive, normalize } from '@/utils/urls';
import { useSidebar } from '@/components/sidebar/base';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { SidebarTab } from '@/components/sidebar/tabs';

export interface SidebarTabWithProps extends SidebarTab {
  props?: ComponentProps<'a'>;
}

export function SidebarTabsDropdown({
  options,
  placeholder,
  className,
  ...props
}: {
  placeholder?: ReactNode;
  options: SidebarTabWithProps[];
} & ComponentProps<'button'>) {
  const [open, setOpen] = useState(false);
  const { closeOnRedirect } = useSidebar();
  const pathname = usePathname();

  const selected = useMemo(() => {
    return options.findLast((item) => isTabActive(item, pathname));
  }, [options, pathname]);

  const onClick = () => {
    closeOnRedirect.current = false;
    setOpen(false);
  };

  const item = selected ? (
    <>
      <div className="size-5 shrink-0 empty:hidden">{selected.icon}</div>
      <p className="font-medium">{selected.title}</p>
    </>
  ) : (
    placeholder
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {item && (
        <PopoverTrigger
          className={cn(
            'flex items-center gap-2 rounded-full p-1.5 border shadow-sm text-sm text-start transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground data-open:bg-fd-accent data-open:text-fd-accent-foreground',
            className,
          )}
          {...props}
        >
          {item}
          <ChevronsUpDown className="shrink-0 ms-auto size-4 text-fd-muted-foreground" />
        </PopoverTrigger>
      )}
      <PopoverContent
        align="start"
        className="flex flex-col gap-1 max-w-svw p-1 fd-scroll-container"
      >
        {options.map((item) => {
          const isActive = selected && item.url === selected.url;
          if (!isActive && item.unlisted) return;

          return (
            <Link
              key={item.url}
              href={item.url}
              onClick={onClick}
              {...item.props}
              className={cn(
                'flex items-center gap-2 rounded-lg p-1.5 hover:bg-fd-accent hover:text-fd-accent-foreground',
                item.props?.className,
              )}
            >
              <div className="shrink-0 mb-auto size-5 empty:hidden">{item.icon}</div>
              <div>
                <p className="text-sm font-medium leading-none">{item.title}</p>
                <p className="text-[0.8125rem] text-fd-muted-foreground mt-1 empty:hidden">
                  {item.description}
                </p>
              </div>

              <Check
                className={cn(
                  'shrink-0 ms-auto size-3.5 text-fd-primary',
                  !isActive && 'invisible',
                )}
              />
            </Link>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

export function isTabActive(tab: SidebarTab, pathname: string) {
  if (tab.urls) return tab.urls.has(normalize(pathname));

  return isActive(tab.url, pathname, true);
}
