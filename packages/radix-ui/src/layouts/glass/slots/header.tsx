'use client';
import { isLayoutTabActive, type LayoutTab } from '@/layouts/shared';
import Link from 'fumadocs-core/link';
import { type ComponentProps, useState } from 'react';
import {
  ChevronDown,
  ChevronsUpDown,
  LanguagesIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
  SidebarIcon,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { buttonVariants } from '@/components/ui/button';
import { useTranslations } from '@fuma-translate/react';
import { usePathname } from 'fumadocs-core/framework';
import { SidebarTrigger } from '@/components/sidebar/base';
import { useGlassLayout } from '..';

export type HeaderProps = ComponentProps<'div'>;

const baseVariants =
  'rounded-full bg-fd-popover/80 text-fd-popover-foreground border backdrop-blur-sm shadow-md';

export function Header({ className, ...props }: HeaderProps) {
  const {
    props: { tabs, aiChat },
    slots,
  } = useGlassLayout();
  const t = useTranslations();

  return (
    <div
      className={cn(
        'sticky flex flex-row gap-2 [grid-area:left-margin/left-margin/right/right] z-20 px-4 md:top-0 md:pt-2 md:px-5 md:h-12 md:bg-linear-to-b md:from-fd-background max-md:bottom-0 max-md:mt-auto max-md:h-14 max-md:pb-4 max-md:bg-linear-to-t max-md:from-fd-background',
        className,
      )}
      {...props}
    >
      <Popover>
        <PopoverTrigger
          className={cn(
            buttonVariants({
              variant: 'secondary',
              size: 'icon-sm',
            }),
            baseVariants,
            'size-10 shrink-0 data-[state=open]:bg-fd-accent md:hidden',
          )}
        >
          <MoreHorizontalIcon />
        </PopoverTrigger>
        <PopoverContent align="start" className="flex flex-col min-w-48 p-1">
          {aiChat && (
            <button
              type="button"
              onClick={() => aiChat.onOpenChange(!aiChat.open)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-fd-accent hover:text-fd-accent-foreground"
            >
              <MessageCircleIcon className="size-4 text-fd-muted-foreground" />
              {t('Ask AI', { note: 'AI chat button' })}
            </button>
          )}
          {(slots.languageSelect || slots.themeSwitch) && (
            <div className="flex items-center justify-between border-t mt-2 pt-2 p-1 gap-2 first:border-t-0 first:mt-0">
              {slots.languageSelect && (
                <slots.languageSelect.root className="flex-1">
                  <slots.languageSelect.text />
                  <ChevronsUpDown className="ms-auto size-3.5 text-fd-muted-foreground shrink-0" />
                </slots.languageSelect.root>
              )}
              {slots.themeSwitch && <slots.themeSwitch className="p-0" />}
            </div>
          )}
        </PopoverContent>
      </Popover>
      {tabs.length > 0 && (
        <LayoutTabs tabs={tabs} className={cn(baseVariants, 'min-w-0 max-sm:flex-1')} />
      )}
      {slots.languageSelect && (
        <slots.languageSelect.root className={cn(baseVariants, 'px-3 rounded-full max-md:hidden')}>
          <LanguagesIcon className="size-4 text-fd-muted-foreground shrink-0" />
          <slots.languageSelect.text />
          <ChevronsUpDown className="size-3.5 text-fd-muted-foreground shrink-0" />
        </slots.languageSelect.root>
      )}
      {slots.searchTrigger && (
        <>
          <slots.searchTrigger.sm
            color="secondary"
            className={cn(baseVariants, 'ms-auto size-10 shrink-0 lg:hidden')}
          />
          <slots.searchTrigger.full
            className={cn(
              baseVariants,
              'ms-auto max-w-[280px] flex-1 text-fd-muted-foreground ps-3 pe-2.5 max-lg:hidden',
            )}
          />
        </>
      )}
      {aiChat && !aiChat.open && (
        <button
          className={cn(
            buttonVariants({ variant: 'secondary' }),
            baseVariants,
            'px-3 gap-2 text-fd-muted-foreground shrink-0 max-md:hidden',
          )}
          onClick={() => aiChat.onOpenChange(true)}
        >
          <MessageCircleIcon className="size-4" />
          {t('Ask AI', { note: 'AI chat button' })}
        </button>
      )}
      <SidebarTrigger
        className={cn(
          buttonVariants({ variant: 'secondary', size: 'icon-sm' }),
          baseVariants,
          'shrink-0 size-10 md:hidden',
        )}
      >
        <SidebarIcon />
      </SidebarTrigger>
    </div>
  );
}

function LayoutTabs({
  tabs,
  className,
  ...props
}: { tabs: LayoutTab[] } & ComponentProps<typeof PopoverTrigger>) {
  const pathname = usePathname();
  const t = useTranslations();
  const selected = tabs.findLast((t) => isLayoutTabActive(t, pathname));
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'inline-flex items-center gap-2 text-sm px-3 py-1 font-medium rounded-full transition-colors [&_svg]:size-4 hover:bg-fd-accent data-[state=open]:bg-fd-accent',
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
        <ChevronDown className="ms-auto shrink-0 text-fd-muted-foreground size-3.5!" />
      </PopoverTrigger>
      <PopoverContent className="flex flex-col p-1 w-(--radix-popover-trigger-width)" align="start">
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
