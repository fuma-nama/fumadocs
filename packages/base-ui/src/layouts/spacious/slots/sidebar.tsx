'use client';
import { Menu } from '@base-ui/react/menu';
import { ScrollArea } from '@base-ui/react/scroll-area';
import { usePathname } from 'fumadocs-core/framework';
import Link from 'fumadocs-core/link';
import {
  CheckIcon,
  ChevronsUpDownIcon,
  LanguagesIcon,
  MessageCircleIcon,
  SidebarIcon,
} from 'lucide-react';
import type { ComponentProps } from 'react';
import { useTranslations } from '@fuma-translate/react';
import * as Base from '@/components/sidebar/base';
import { createPageTreeRenderer } from '@/components/sidebar/page-tree';
import { createLinkItemRenderer } from '@/components/sidebar/link-item';
import { buttonVariants } from '@/components/ui/button';
import { useTabsGroups, useTreePath } from '@/contexts/tree';
import { isLayoutTabActive, type LayoutTab, LinkItem } from '@/layouts/shared';
import { cn } from '@/utils/cn';
import { useSpaciousLayout } from '..';

export type SidebarProviderProps = Base.SidebarProviderProps;
export type SidebarProps = ComponentProps<'aside'>;

/** the hover fill comes from the gliding block of `SidebarItems` */
const itemClass =
  'relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-start text-fd-muted-foreground wrap-anywhere outline-none transition-colors focus-visible:ring-2 focus-visible:ring-fd-ring hover:not-data-[active=true]:text-fd-accent-foreground data-[active=true]:bg-fd-primary/10 data-[active=true]:text-fd-primary [&_svg]:size-4 [&_svg]:shrink-0';

/** highlight the guide line next to an active nested item */
const nestedItemClass =
  "data-[active=true]:before:content-[''] data-[active=true]:before:absolute data-[active=true]:before:-start-1 data-[active=true]:before:inset-y-2 data-[active=true]:before:w-px data-[active=true]:before:bg-fd-primary";

export function SidebarProvider(props: SidebarProviderProps) {
  return <Base.SidebarProvider {...props} />;
}

export function Sidebar({ className, ...props }: SidebarProps) {
  const { collapsed, mode } = Base.useSidebar();
  const { slots } = useSpaciousLayout();
  // the drawer is used instead
  if (mode !== 'full') return;

  return (
    <aside
      id="nd-sidebar"
      data-collapsed={collapsed}
      inert={collapsed}
      className={cn(
        'group/sidebar [grid-area:sidebar] flex min-h-0 overflow-clip text-sm max-md:hidden',
        // keep a gutter in place of the collapsed sidebar
        collapsed
          ? 'md:layout:[--fd-sidebar-width:--spacing(2)]'
          : 'md:layout:[--fd-sidebar-width:268px]',
        className,
      )}
      {...props}
    >
      <div className="flex flex-col shrink-0 w-[268px] transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[collapsed=true]/sidebar:-translate-x-3 group-data-[collapsed=true]/sidebar:opacity-0 rtl:group-data-[collapsed=true]/sidebar:translate-x-3 motion-reduce:transition-none">
        <div className="flex items-center gap-2 h-18 ps-5.5 pe-3">
          <slots.navTitle className="inline-flex items-center gap-2 min-w-0 me-auto text-[0.9375rem] font-semibold" />
          <Base.SidebarCollapseTrigger
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
              'size-8 text-fd-muted-foreground',
            )}
          >
            <SidebarIcon />
          </Base.SidebarCollapseTrigger>
        </div>
        <div className="flex flex-col gap-2 px-3 empty:hidden">
          <TabsMenu />
          {slots.searchTrigger && (
            <slots.searchTrigger.full
              hideIfDisabled
              className="h-10 gap-3 rounded-xl ps-[9px] pe-2 [&_svg]:shrink-0"
            />
          )}
        </div>
        <SidebarViewport />
      </div>
    </aside>
  );
}

export function SidebarDrawer() {
  const { setOpen } = Base.useSidebar();
  const {
    slots,
    menuItems,
    props: { aiChat },
  } = useSpaciousLayout();
  const t = useTranslations({ note: 'AI chat button' });

  return (
    <>
      <Base.SidebarDrawerOverlay className="fixed z-40 inset-0 backdrop-blur-xs data-[state=open]:animate-fd-fade-in data-[state=closed]:animate-fd-fade-out" />
      <Base.SidebarDrawerContent className="fixed z-40 inset-e-0 inset-y-0 flex flex-col w-[85%] max-w-[380px] text-[0.9375rem] bg-fd-background border-s shadow-lg data-[state=open]:animate-fd-sidebar-in data-[state=closed]:animate-fd-sidebar-out">
        {/* the close button takes the place of navbar's sidebar trigger */}
        <div className="flex items-center gap-1.5 h-14 ps-[13px] pe-2.5 text-fd-muted-foreground">
          <div className="flex flex-1">
            {menuItems.map(
              (item, i) =>
                item.type === 'icon' && (
                  <LinkItem
                    key={i}
                    item={item}
                    aria-label={item.label}
                    className={buttonVariants({
                      variant: 'ghost',
                      size: 'icon-sm',
                      className: 'p-2',
                    })}
                  >
                    {item.icon}
                  </LinkItem>
                ),
            )}
          </div>
          {slots.languageSelect && (
            <slots.languageSelect.root>
              <LanguagesIcon className="size-4.5" />
              <slots.languageSelect.text />
            </slots.languageSelect.root>
          )}
          {slots.themeSwitch && <slots.themeSwitch className="p-0" />}
          <Base.SidebarTrigger
            className={buttonVariants({ variant: 'ghost', size: 'icon-sm', className: 'p-2' })}
          >
            <SidebarIcon />
          </Base.SidebarTrigger>
        </div>
        <div className="flex flex-col gap-2 px-3 empty:hidden">
          <TabsMenu />
          {aiChat && (
            <button
              type="button"
              className={cn(itemClass, 'hover:bg-fd-accent/60')}
              onClick={() => {
                setOpen(false);
                aiChat.onOpenChange(true);
              }}
            >
              <MessageCircleIcon />
              {t('Ask AI')}
            </button>
          )}
        </div>
        <SidebarViewport />
      </Base.SidebarDrawerContent>
    </>
  );
}

/** switch between layout tabs */
function TabsMenu() {
  const {
    props: { tabs },
  } = useSpaciousLayout();
  const t = useTranslations();
  const pathname = usePathname();
  const path = useTreePath();
  const options =
    useTabsGroups(tabs).findLast((group) => typeof group.active?.root !== 'string')?.options ?? [];
  const selected = options.findLast((tab) => isLayoutTabActive(tab, path, pathname));
  if (options.length === 0) return;

  return (
    <Menu.Root>
      <Menu.Trigger className="flex w-full h-10 items-center gap-3 rounded-xl border bg-fd-secondary/50 ps-[9px] pe-2.5 text-start font-medium outline-none transition-colors hover:bg-fd-accent focus-visible:ring-2 focus-visible:ring-fd-ring data-popup-open:bg-fd-accent [&_svg]:size-4 [&_svg]:shrink-0">
        {selected && <TabIcon tab={selected} />}
        <span className={cn('flex-1 truncate', !selected && 'text-fd-muted-foreground')}>
          {selected ? selected.title : t('Layout Tab', { note: 'layout tab trigger' })}
        </span>
        <ChevronsUpDownIcon className="size-3.5! text-fd-muted-foreground" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          align="start"
          sideOffset={8}
          alignOffset={-4}
          positionMethod="fixed"
          className="z-50"
        >
          <Menu.Popup className="flex flex-col w-[calc(var(--anchor-width)+--spacing(2))] max-h-(--available-height) overflow-y-auto p-1 rounded-2xl border bg-fd-popover text-sm text-fd-popover-foreground shadow-lg outline-none origin-(--transform-origin) transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] data-starting-style:opacity-0 data-starting-style:scale-95 data-ending-style:opacity-0 data-ending-style:scale-[0.97] data-ending-style:duration-100 motion-reduce:transition-none">
            {options.map((tab, i) => {
              if (tab.unlisted && tab !== selected) return;

              return (
                <Menu.LinkItem
                  key={i}
                  closeOnClick
                  render={<Link href={tab.url} {...tab.props} />}
                  className={cn(
                    'flex w-full min-h-9 items-start gap-3 rounded-lg px-[9px] py-2 text-start outline-none transition-colors duration-100 data-highlighted:bg-fd-accent data-highlighted:text-fd-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0',
                    tab.props?.className,
                  )}
                >
                  <TabIcon tab={tab} className="mt-0.5" />
                  <span className="flex flex-col flex-1 min-w-0">
                    <span className="truncate font-medium">{tab.title}</span>
                    {tab.description && (
                      <span className="truncate text-xs text-fd-muted-foreground">
                        {tab.description}
                      </span>
                    )}
                  </span>
                  {tab === selected && <CheckIcon className="mt-0.5 text-fd-primary" />}
                </Menu.LinkItem>
              );
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function TabIcon({ tab, className }: { tab: LayoutTab; className?: string }) {
  return (
    <span
      className={cn(
        'flex items-center justify-center shrink-0 size-4 font-medium',
        !tab.icon && 'rounded bg-fd-muted text-[10px] text-fd-muted-foreground',
        className,
      )}
    >
      {tab.icon ?? (typeof tab.title === 'string' ? tab.title.charAt(0) : null)}
    </span>
  );
}

function SidebarViewport() {
  return (
    <ScrollArea.Root className="min-h-0 flex-1 mt-2">
      <ScrollArea.Viewport className="size-full overscroll-contain px-3 pt-4 pb-8 mask-[linear-gradient(to_bottom,transparent,white_16px,white_calc(100%-32px),transparent)]">
        <SidebarItems />
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        className={(s) =>
          cn('flex w-1.5 py-2 select-none transition-opacity', !s.hovering && 'opacity-0')
        }
      >
        <ScrollArea.Thumb className="flex-1 rounded-full bg-fd-border" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}

function SidebarItems() {
  const { menuItems } = useSpaciousLayout();

  return (
    <div ref={follow} className="relative flex flex-col gap-6">
      <div
        aria-hidden
        className="absolute top-0 left-0 rounded-lg bg-fd-accent/60 opacity-0 pointer-events-none transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:data-glide:transition-[translate,width,height,opacity]"
      />
      <div className="flex flex-col empty:hidden">
        {menuItems.map(
          (item, i) => item.type !== 'icon' && <SidebarLinkItem key={i} item={item} />,
        )}
      </div>
      <div className="flex flex-col">
        <SidebarPageTree />
      </div>
    </div>
  );
}

/** a soft block glides to the item under the mouse or keyboard focus */
function follow(area: HTMLDivElement | null) {
  const block = area?.firstElementChild;
  if (!area || !(block instanceof HTMLElement)) return;
  let current: Element | null = null;

  const show = (item: Element | null) => {
    if (item === current) return;
    // glide between items, appear in place when coming from outside
    block.toggleAttribute('data-glide', current !== null);
    current = item;
    if (!item) {
      block.style.opacity = '0';
      return;
    }

    const rect = item.getBoundingClientRect();
    const origin = area.getBoundingClientRect();
    // inset to keep apart from the background of active item
    block.style.translate = `${rect.left - origin.left}px ${rect.top - origin.top + 2}px`;
    block.style.width = `${rect.width}px`;
    block.style.height = `${rect.height - 4}px`;
    // still glide through it, the active item has its own background
    block.style.opacity = item.matches('[data-active=true]') ? '0' : '1';
  };
  const itemOf = (target: EventTarget | null) =>
    target instanceof Element ? target.closest('a[href], button') : null;

  const controller = new AbortController();
  const { signal } = controller;
  area.addEventListener(
    'pointerover',
    (e) => {
      const item = itemOf(e.target);
      // hold the position over separators and gaps
      if (item && e.pointerType === 'mouse') show(item);
    },
    { signal },
  );
  area.addEventListener('pointerleave', () => show(null), { signal });
  area.addEventListener(
    'focusin',
    (e) => {
      if (e.target instanceof Element && e.target.matches(':focus-visible')) show(itemOf(e.target));
    },
    { signal },
  );
  area.addEventListener(
    'focusout',
    () => {
      if (!area.matches(':hover')) show(null);
    },
    { signal },
  );
  return () => controller.abort();
}

function SidebarSeparator({ className, ...props }: ComponentProps<'p'>) {
  const depth = Base.useFolderDepth();

  return (
    <Base.SidebarSeparator
      className={cn(
        'mb-1.5 px-2.5 text-xs font-medium text-fd-muted-foreground [&_svg]:size-3.5 [&_svg]:shrink-0',
        depth > 0 && 'mt-4 first:mt-1',
        className,
      )}
      {...props}
    />
  );
}

function SidebarItem({ className, ...props }: ComponentProps<typeof Base.SidebarItem>) {
  const depth = Base.useFolderDepth();

  return (
    <Base.SidebarItem
      className={cn(itemClass, depth > 0 && nestedItemClass, className)}
      {...props}
    />
  );
}

function SidebarFolderTrigger(props: ComponentProps<typeof Base.SidebarFolderTrigger>) {
  return (
    <Base.SidebarFolderTrigger {...props} className={cn(itemClass, '[&>[data-icon]]:size-3.5')} />
  );
}

function SidebarFolderLink({ className, ...props }: ComponentProps<typeof Base.SidebarFolderLink>) {
  const depth = Base.useFolderDepth();

  return (
    <Base.SidebarFolderLink
      className={cn(itemClass, '[&>[data-icon]]:size-3.5', depth > 1 && nestedItemClass, className)}
      {...props}
    />
  );
}

function SidebarFolderContent(props: ComponentProps<typeof Base.SidebarFolderContent>) {
  return (
    <Base.SidebarFolderContent
      {...props}
      className="relative flex flex-col ms-3 ps-1 before:content-[''] before:absolute before:start-0 before:inset-y-1 before:w-px before:bg-fd-border"
    />
  );
}

const SidebarPageTree = createPageTreeRenderer({
  SidebarFolder: Base.SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
  SidebarSeparator,
});

const SidebarLinkItem = createLinkItemRenderer({
  SidebarFolder: Base.SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
});
