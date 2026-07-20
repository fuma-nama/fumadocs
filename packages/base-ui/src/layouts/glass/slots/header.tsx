'use client';
import { Drawer } from '@base-ui/react/drawer';
import { type ComponentProps } from 'react';
import { ChevronsUpDown, LanguagesIcon, MessageCircleIcon, SidebarIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { useTranslations } from '@fuma-translate/react';
import { useGlassLayout } from '..';
import { LayoutTabsDropdown } from '../layout-tabs';

export type HeaderProps = ComponentProps<'div'>;

const baseVariants =
  'rounded-full bg-fd-popover/80 text-fd-popover-foreground border backdrop-blur-sm shadow-sm';

export function Header({ className, ...props }: HeaderProps) {
  const {
    props: { tabs, aiChat },
    slots,
  } = useGlassLayout();
  const t = useTranslations();
  const sidebar = slots.sidebar.use();

  return (
    <div
      className={cn(
        'sticky flex flex-row justify-end gap-2 [grid-area:left-margin/left-margin/right/right] z-20 px-4 md:top-0 md:pt-2 md:px-2 md:h-12 md:bg-linear-to-b md:from-fd-background max-md:bottom-0 max-md:mt-auto max-md:h-16 max-md:pb-4 max-md:bg-linear-to-t max-md:from-fd-background',
        className,
      )}
      {...props}
    >
      {sidebar.collapsible && sidebar.collapsed && (
        <button
          aria-label={t('Show Sidebar', { note: 'sidebar' })}
          className={cn(
            buttonVariants({ size: 'icon-sm', variant: 'secondary' }),
            baseVariants,
            'size-10 me-auto shrink-0 max-md:hidden',
          )}
          onClick={() => sidebar.setCollapsed(false)}
        >
          <SidebarIcon />
        </button>
      )}
      {slots.searchTrigger && (
        <slots.searchTrigger.sm
          color="secondary"
          size="icon"
          className={cn(baseVariants, 'size-12 shrink-0 md:hidden')}
        />
      )}
      {tabs.length > 0 && (
        <LayoutTabsDropdown
          tabs={tabs}
          size="lg"
          className={cn(baseVariants, 'min-w-0 ps-4 pe-3 flex-1 [&_svg]:size-5 md:hidden')}
        />
      )}
      {slots.searchTrigger && (
        <div className="@container flex justify-end flex-1 max-md:hidden">
          <slots.searchTrigger.full
            className={cn(baseVariants, 'text-fd-muted-foreground ps-3 w-full @sm:max-w-[200px]')}
          />
        </div>
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
      {slots.languageSelect && (
        <slots.languageSelect.root className={cn(baseVariants, 'px-3 rounded-full max-md:hidden')}>
          <LanguagesIcon className="size-4 text-fd-muted-foreground shrink-0" />
          <slots.languageSelect.text />
          <ChevronsUpDown className="size-3.5 text-fd-muted-foreground shrink-0" />
        </slots.languageSelect.root>
      )}
      {slots.themeSwitch && (
        <slots.themeSwitch className={cn(baseVariants, 'shrink-0 px-1.5 max-md:hidden')} />
      )}
      <Drawer.Trigger
        handle={slots.sidebar.drawerHandle}
        render={(props, { open }) => (
          <button
            {...props}
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'icon' }),
              baseVariants,
              'shrink-0 size-12 md:hidden',
            )}
            aria-label={
              open
                ? t('Close Sidebar', { note: 'aria-label' })
                : t('Open Sidebar', { note: 'aria-label' })
            }
          >
            <SidebarIcon />
          </button>
        )}
      />
    </div>
  );
}
