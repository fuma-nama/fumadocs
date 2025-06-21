'use client';
import { ChevronsUpDown } from 'lucide-react';
import { type ComponentProps, type ReactNode, useMemo, useState } from 'react';
import Link from 'fumadocs-core/link';
import { usePathname } from 'fumadocs-core/framework';
import { cn } from '@/utils/cn';
import { isActive } from '@/utils/is-active';
import { useSidebar } from '@/contexts/sidebar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

export interface Option {
  /**
   * Redirect URL of the folder, usually the index page
   */
  url: string;

  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;

  /**
   * Detect from a list of urls
   */
  urls?: Set<string>;

  props?: ComponentProps<'a'>;
}

export function RootToggle({
  options,
  placeholder,
  ...props
}: {
  placeholder?: ReactNode;
  options: Option[];
} & ComponentProps<'button'>) {
  const [open, setOpen] = useState(false);
  const { closeOnRedirect } = useSidebar();
  const pathname = usePathname();

  const selected = useMemo(() => {
    return options.findLast((item) =>
      item.urls
        ? item.urls.has(
            pathname.endsWith('/') ? pathname.slice(0, -1) : pathname,
          )
        : isActive(item.url, pathname, true),
    );
  }, [options, pathname]);

  const onClick = () => {
    closeOnRedirect.current = false;
    setOpen(false);
  };

  const item = selected ? <Item {...selected} /> : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {item && (
        <PopoverTrigger
          {...props}
          className={cn(
            'flex items-center gap-2 rounded-lg p-2 border bg-fd-secondary/50 text-fd-secondary-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground data-[state=open]:bg-fd-accent',
            props.className,
          )}
        >
          {item}
          <ChevronsUpDown className="size-4 text-fd-muted-foreground" />
        </PopoverTrigger>
      )}
      <PopoverContent className="flex flex-col gap-2 min-w-(--radix-popover-trigger-width) overflow-hidden p-1">
        {options
          .filter((item) => item !== selected)
          .map((item) => (
            <Link
              key={item.url}
              href={item.url}
              onClick={onClick}
              {...item.props}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg p-1 hover:bg-fd-accent hover:text-fd-accent-foreground',
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
      <>{props.icon}</>
      <div className="flex-1 text-start">
        <p className="text-[15px] mb-0.5 font-medium md:text-sm">
          {props.title}
        </p>
        <p className="text-sm text-fd-muted-foreground empty:hidden md:text-[13px]">
          {props.description}
        </p>
      </div>
    </>
  );
}
