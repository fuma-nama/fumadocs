'use client';
import { Drawer } from '@base-ui/react/drawer';
import { ScrollArea } from '@base-ui/react/scroll-area';
import { MessageCircleIcon, SidebarIcon, XIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslations } from '@fuma-translate/react';
import * as Base from '@/components/sidebar/base';
import { createPageTreeRenderer } from '@/components/sidebar/page-tree';
import { createLinkItemRenderer } from '@/components/sidebar/link-item';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { useSpaciousLayout } from '..';
import { SiteMenu } from './menu';

export type SidebarProviderProps = Base.SidebarProviderProps;
export type SidebarProps = ComponentProps<'aside'>;

/** the hover fill comes from `HoverArea` */
const itemClass =
  'relative flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start text-fd-muted-foreground wrap-anywhere outline-none transition-colors focus-visible:ring-2 focus-visible:ring-fd-ring hover:not-data-[active=true]:text-fd-accent-foreground data-[active=true]:bg-fd-primary/10 data-[active=true]:text-fd-primary [&_svg]:size-4 [&_svg]:shrink-0';

/** highlight the guide line next to an active nested item */
const nestedItemClass =
  "data-[active=true]:before:content-[''] data-[active=true]:before:absolute data-[active=true]:before:-start-1 data-[active=true]:before:inset-y-1.5 data-[active=true]:before:w-px data-[active=true]:before:bg-fd-primary";

/** fade out when collapsed into a rail */
const railHidden = 'transition-opacity duration-200 group-data-[collapsed=true]/sidebar:opacity-0';

/** shrink into an icon button when collapsed into a rail */
const railItemClass = cn(
  itemClass,
  'overflow-hidden whitespace-nowrap transition-[width,color,background-color] hover:bg-fd-accent/60 group-data-[collapsed=true]/sidebar:w-8',
);

export function SidebarProvider(props: SidebarProviderProps) {
  return <Base.SidebarProvider {...props} />;
}

export function Sidebar({ className, ...props }: SidebarProps) {
  const { collapsed } = Base.useSidebar();
  const { slots } = useSpaciousLayout();

  return (
    <aside
      id="nd-sidebar"
      data-collapsed={collapsed}
      className={cn(
        'group/sidebar relative [grid-area:sidebar] flex overflow-hidden text-sm max-md:hidden',
        collapsed
          ? 'md:layout:[--fd-sidebar-width:--spacing(12)]'
          : 'md:layout:[--fd-sidebar-width:268px]',
        className,
      )}
      {...props}
    >
      <div className="flex flex-col shrink-0 w-[268px]">
        <div className="flex items-center h-16 ps-4 pe-12">
          <slots.navTitle
            className={cn(
              'inline-flex items-center gap-2 min-w-0 text-[0.9375rem] font-semibold',
              railHidden,
            )}
          />
        </div>
        <SidebarActions />
        <SidebarBody
          inert={collapsed}
          className="transition-opacity duration-200 group-data-[collapsed=true]/sidebar:opacity-0"
        />
        <div className="p-2">
          <SiteMenu />
        </div>
      </div>
      <Base.SidebarCollapseTrigger
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'absolute top-4 end-2 size-8 text-fd-muted-foreground',
        )}
      >
        <SidebarIcon />
      </Base.SidebarCollapseTrigger>
    </aside>
  );
}

export function SidebarDrawer() {
  const { open, setOpen } = Base.useSidebar();
  const { slots } = useSpaciousLayout();
  const t = useTranslations({ note: 'sidebar' });

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} swipeDirection="left">
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 bg-fd-overlay backdrop-blur-xs opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:duration-0 data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)]" />
        <Drawer.Viewport className="fixed inset-0 z-40 flex">
          <Drawer.Popup
            id="nd-sidebar-mobile"
            className="flex flex-col w-[85vw] max-w-[320px] h-full overflow-y-auto overscroll-contain [scrollbar-width:none] bg-fd-card text-[0.9375rem] border-e shadow-xl outline-none [transform:translateX(var(--drawer-swipe-movement-x))] transition-transform duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:select-none data-swiping:duration-0 data-starting-style:[transform:translateX(-100%)] data-ending-style:[transform:translateX(-100%)] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)]"
          >
            <Drawer.Content className="flex flex-col flex-1">
              <div className="sticky top-0 z-10 flex items-center h-14 ps-4 pe-2 bg-fd-card">
                <Drawer.Title
                  render={
                    <slots.navTitle className="inline-flex items-center gap-2 min-w-0 me-auto font-semibold" />
                  }
                />
                <Drawer.Close
                  aria-label={t('Close Sidebar', { note: 'aria-label' })}
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                    'text-fd-muted-foreground',
                  )}
                >
                  <XIcon />
                </Drawer.Close>
              </div>
              <SidebarActions />
              <div className="flex flex-col flex-1 px-2 pb-4">
                <SidebarItems />
              </div>
              <div className="sticky bottom-0 p-2 bg-fd-card">
                <SiteMenu />
              </div>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function SidebarActions() {
  const {
    slots,
    props: { aiChat },
  } = useSpaciousLayout();
  const t = useTranslations({ note: 'AI chat button' });

  return (
    <div className="flex flex-col gap-1.5 px-2 pb-2 empty:hidden">
      {slots.searchTrigger && (
        <slots.searchTrigger.full
          hideIfDisabled
          className="w-full overflow-hidden whitespace-nowrap ps-[7px] transition-[width,color,background-color] [&_svg]:shrink-0 group-data-[collapsed=true]/sidebar:w-8 group-data-[collapsed=true]/sidebar:text-transparent group-data-[collapsed=true]/sidebar:[&_svg]:text-fd-muted-foreground"
        />
      )}
      {aiChat && (
        <button
          type="button"
          aria-pressed={aiChat.open}
          className={railItemClass}
          onClick={() => aiChat.onOpenChange(!aiChat.open)}
        >
          <MessageCircleIcon />
          <span className={railHidden}>{t('Ask AI')}</span>
        </button>
      )}
    </div>
  );
}

function SidebarBody({ className, ...props }: ComponentProps<'div'>) {
  return (
    <ScrollArea.Root className={cn('min-h-0 flex-1', className)} {...props}>
      <ScrollArea.Viewport className="size-full overscroll-contain px-2 pt-2 pb-6 mask-[linear-gradient(to_bottom,transparent,white_8px,white_calc(100%-24px),transparent)]">
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
    <HoverArea className="flex flex-col gap-6">
      <div className="flex flex-col gap-0.5 empty:hidden">
        {menuItems.map(
          (item, i) => item.type !== 'icon' && <SidebarLinkItem key={i} item={item} />,
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <SidebarPageTree />
      </div>
    </HoverArea>
  );
}

/**
 * A soft block glides to the item under the mouse or keyboard focus.
 */
function HoverArea({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div ref={follow} className={cn('relative', className)}>
      <div
        aria-hidden
        className="absolute top-0 left-0 rounded-lg bg-fd-accent/60 opacity-0 pointer-events-none transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:data-glide:transition-[translate,width,height,opacity]"
      />
      {children}
    </div>
  );
}

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
    block.style.translate = `${rect.left - origin.left}px ${rect.top - origin.top}px`;
    block.style.width = `${rect.width}px`;
    block.style.height = `${rect.height}px`;
    block.style.opacity = '1';
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
        'mb-1 px-2 text-xs font-medium text-fd-muted-foreground [&_svg]:size-3.5 [&_svg]:shrink-0',
        depth > 0 && 'mt-3 first:mt-1',
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
      className="relative flex flex-col gap-0.5 ms-3 ps-1 pt-0.5 before:content-[''] before:absolute before:start-0 before:inset-y-0.5 before:w-px before:bg-fd-border"
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
