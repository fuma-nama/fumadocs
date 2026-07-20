import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslations } from '@fuma-translate/react';
import { usePathname } from 'fumadocs-core/framework';
import { ChevronsUpDown } from 'lucide-react';
import { type ComponentProps, useState } from 'react';
import { type LayoutTab, isLayoutTabActive } from '../shared';
import { cn } from '@/utils/cn';
import Link from 'fumadocs-core/link';

export function LayoutTabsDropdown({
  tabs,
  className,
  size = 'default',
  ...props
}: { tabs: LayoutTab[]; size?: 'default' | 'lg' } & ComponentProps<typeof PopoverTrigger>) {
  const pathname = usePathname();
  const t = useTranslations();
  const selected = tabs.findLast((t) => isLayoutTabActive(t, pathname));
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'inline-flex items-center gap-2 text-sm font-medium rounded-full transition-colors hover:bg-fd-accent data-[state=open]:bg-fd-accent',
          size === 'lg' && 'text-[0.9375rem]',
          className,
        )}
        {...props}
      >
        {selected ? (
          <>
            {selected.icon}
            <span className="truncate">{selected.title}</span>
          </>
        ) : (
          <span className="text-fd-muted-foreground truncate">
            {t('Layout Tab', { note: 'layout tab trigger' })}
          </span>
        )}
        <ChevronsUpDown
          className={cn(
            'ms-auto shrink-0 text-fd-muted-foreground',
            size === 'default' && 'size-3.5!',
            size === 'lg' && 'size-4!',
          )}
        />
      </PopoverTrigger>
      <PopoverContent
        className="flex flex-col p-1 rounded-xl w-(--radix-popover-trigger-width)"
        align="start"
      >
        {tabs.map((t, i) => {
          if (t.unlisted && t !== selected) return;
          return (
            <Link
              key={i}
              href={t.url}
              className={cn(
                'text-sm px-2 py-1.5 rounded-lg',
                selected === t
                  ? 'bg-fd-primary/10 text-fd-primary'
                  : 'hover:bg-fd-accent hover:text-fd-accent-foreground',
              )}
              onClick={() => setOpen(false)}
            >
              <div className="font-medium inline-flex items-center gap-2 [&_svg]:size-4">
                {t.icon}
                {t.title}
              </div>
              <p
                className={cn(
                  'mt-1 text-xs text-fd-muted-foreground empty:hidden',
                  selected === t && 'text-fd-primary/80',
                )}
              >
                {t.description}
              </p>
            </Link>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
