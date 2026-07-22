'use client';
import { Drawer } from '@base-ui/react/drawer';
import type * as PageTree from 'fumadocs-core/page-tree';
import { type IconItemType, isLinkItemActive, type LinkItemType } from '@/layouts/shared';
import { useTreeContext, useTreePath } from '@/contexts/tree';
import Link from 'fumadocs-core/link';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  cloneElement,
  type ComponentProps,
  createContext,
  ReactNode,
  use,
  useMemo,
  useState,
} from 'react';
import { cva } from 'class-variance-authority';
import {
  ChevronDown,
  ChevronsUpDown,
  LanguagesIcon,
  MessageCircleIcon,
  SidebarIcon,
  XIcon,
} from 'lucide-react';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import { cn } from '@/utils/cn';
import { ScrollArea, ScrollViewport } from '@/components/ui/scroll-area';
import { buttonVariants } from '@/components/ui/button';
import { usePathname } from 'fumadocs-core/framework';
import { useTranslations } from '@fuma-translate/react';
import { useGlassLayout } from '..';
import { LayoutTabsDropdown } from '../layout-tabs';

export const drawerHandle = Drawer.createHandle();

const itemTriggerVariants = cva(
  'inline-flex items-center gap-2 rounded-lg px-2.5 py-2 md:py-1.5 [&_svg]:size-4 outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
  {
    variants: {
      active: {
        true: 'bg-fd-primary/10 text-fd-primary',
        false: 'text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground',
      },
    },
  },
);

export interface SidebarProviderProps {
  /** @default true */
  collapsible?: boolean;
  children: ReactNode;
}

const Context = createContext<{
  collapsible: boolean;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
} | null>(null);

export function SidebarProvider({ children, collapsible = true }: SidebarProviderProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Context
      value={useMemo(() => ({ collapsible, collapsed, setCollapsed }), [collapsible, collapsed])}
    >
      {children}
    </Context>
  );
}

export function useSidebar() {
  const v = use(Context)!;
  if (!v) throw new Error('Missing <SidebarProvider />');
  return v;
}

export interface SidebarDrawerProps {
  contentProps?: ComponentProps<'div'>;
}

export function SidebarDrawer({ contentProps }: SidebarDrawerProps) {
  const {
    menuItems,
    props: { aiChat },
    slots,
  } = useGlassLayout();
  const { root } = useTreeContext();
  const t = useTranslations();

  return (
    <Drawer.Root handle={drawerHandle} swipeDirection="right">
      <Drawer.Portal className="z-40">
        <Drawer.Backdrop className="[--bleed:3rem] fixed inset-0 min-h-dvh bg-fd-overlay backdrop-blur-sm opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:duration-0 data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] supports-[-webkit-touch-callout:none]:absolute" />
        <Drawer.Viewport className="[--viewport-padding:0px] supports-[-webkit-touch-callout:none]:[--viewport-padding:0.625rem] fixed inset-0 flex items-stretch justify-end p-(--viewport-padding)">
          <Drawer.Popup
            id="nd-mobile-sidebar"
            className={cn(
              'relative [--bleed:3rem] supports-[-webkit-touch-callout:none]:[--bleed:0px] w-[360px] h-full max-w-[calc(100vw-3rem+var(--bleed))] pr-(--bleed) -mr-(--bleed) border-l bg-fd-background text-fd-foreground text-[0.9375rem] outline-none shadow-md touch-auto [transform:translateX(var(--drawer-swipe-movement-x))] transition-transform duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:select-none data-ending-style:[transform:translateX(calc(100%-var(--bleed)+var(--viewport-padding)+2px))] data-starting-style:[transform:translateX(calc(100%-var(--bleed)+var(--viewport-padding)+2px))] supports-[-webkit-touch-callout:none]:border supports-[-webkit-touch-callout:none]:rounded-xl',

              // this could be a bug or deliberate, but scrolling in drawer content will somehow get interrupted on IOS, the reason is unknown but this is the simplest workaround
              // scrollbar-width should be zero because the scrollbar is in fact behind the viewport: | content | bleed | scroll bar |, it will push the content to left if not
              '[scrollbar-width:none] overflow-y-auto',
            )}
          >
            <Drawer.Content
              {...contentProps}
              className={cn('flex flex-col min-h-full px-3', contentProps?.className)}
            >
              <div className="sticky flex flex-col gap-2 top-0 pt-4 pb-2 bg-fd-background shadow-lg shadow-fd-background">
                <div className="flex items-center gap-1.5 ps-2.5">
                  <Drawer.Title
                    render={
                      <slots.navTitle className="flex items-center font-semibold gap-2 flex-1" />
                    }
                  />
                  {aiChat && (
                    <button
                      className={cn(
                        buttonVariants({ variant: 'secondary', size: 'sm' }),
                        'rounded-full h-8 gap-1.5',
                      )}
                      onClick={() => {
                        aiChat.onOpenChange(!aiChat.open);
                        drawerHandle.close();
                      }}
                    >
                      <MessageCircleIcon className="size-4 text-fd-muted-foreground" />
                      {t('Ask AI', { note: 'AI chat button' })}
                    </button>
                  )}
                  <Drawer.Close
                    aria-label={t('Close Sidebar', { note: 'aria-label' })}
                    className={cn(
                      buttonVariants({ variant: 'secondary', size: 'icon-sm' }),
                      'rounded-full',
                    )}
                  >
                    <XIcon />
                  </Drawer.Close>
                </div>
                {slots.languageSelect && (
                  <slots.languageSelect.root
                    variant="secondary"
                    className="px-2.5 gap-2 rounded-lg"
                  >
                    <LanguagesIcon className="size-4 text-fd-muted-foreground shrink-0" />
                    <slots.languageSelect.text />
                    <ChevronsUpDown className="ms-auto size-3.5 text-fd-muted-foreground shrink-0" />
                  </slots.languageSelect.root>
                )}
              </div>
              <div className="flex flex-col py-2 flex-1">
                {menuItems.map(
                  (item, i) => item.type !== 'icon' && <SidebarLinkItem key={i} item={item} />,
                )}
                {root.children.map((item, i) => cloneElement(renderNode(item), { key: i }))}
              </div>
              <div className="flex items-center sticky bottom-0 bg-fd-background px-1 pt-2 pb-4 border-t mt-2 empty:hidden">
                {menuItems.map(
                  (item, i) => item.type === 'icon' && <SidebarIconLinkItem key={i} item={item} />,
                )}
                {slots.themeSwitch && <slots.themeSwitch className="p-0 ms-auto" />}
              </div>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export type SidebarProps = ComponentProps<'aside'>;

export function Sidebar({ className, children, ...props }: SidebarProps) {
  const {
    menuItems,
    props: { tabs },
    slots,
  } = useGlassLayout();
  const { root } = useTreeContext();
  const { collapsible, collapsed, setCollapsed } = useSidebar();
  const t = useTranslations({ note: 'sidebar' });

  return (
    <aside
      id="nd-sidebar"
      className={cn(
        'sticky flex flex-col transition-transform [grid-area:left] my-2 ms-2 z-30 top-2 border rounded-2xl bg-fd-popover/80 text-fd-popover-foreground text-sm backdrop-blur-sm shadow-sm h-[calc(100dvh---spacing(4))] max-md:hidden md:layout:[--fd-left-width:280px]',
        collapsed &&
          'w-[calc(280px---spacing(2))] -translate-x-[280px] md:layout:[--fd-left-width:0px]',
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-1 pt-4 px-3.5 empty:hidden">
        <slots.navTitle className="flex text-sm items-center font-semibold gap-2 me-auto" />
        <div className="flex -mt-1.5 -me-1.5 empty:hidden">
          {menuItems.map(
            (item, i) => item.type === 'icon' && <SidebarIconLinkItem key={i} item={item} />,
          )}
          {collapsible && (
            <button
              aria-label={collapsed ? t('Show Sidebar') : t('Hide Sidebar')}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                'text-fd-muted-foreground',
              )}
              onClick={() => setCollapsed(!collapsed)}
            >
              <SidebarIcon />
            </button>
          )}
        </div>
      </div>
      {tabs.length > 0 && (
        <LayoutTabsDropdown
          tabs={tabs}
          className="min-w-0 bg-fd-secondary text-fd-secondary-foreground rounded-xl px-2.5 py-2 [&_svg]:size-4 border rounded-xl shadow-sm mx-2 mt-2.5 empty:hidden"
        />
      )}
      <ScrollArea className="min-h-0 flex-1">
        <ScrollViewport className="flex flex-col p-2 [mask-image:linear-gradient(to_bottom,transparent,white_16px,white_calc(100%-16px),transparent))]">
          {menuItems.map(
            (item, i) => item.type !== 'icon' && <SidebarLinkItem key={i} item={item} />,
          )}
          {root.children.map((item, i) => cloneElement(renderNode(item), { key: i }))}
        </ScrollViewport>
      </ScrollArea>
      {children}
    </aside>
  );
}

function SidebarIconLinkItem({ item, className }: { item: IconItemType; className?: string }) {
  return (
    <Link
      href={item.url}
      external={item.external}
      aria-label={item.label}
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
        'text-fd-muted-foreground',
        className,
      )}
      onClick={() => {
        drawerHandle.close();
      }}
    >
      {item.icon}
    </Link>
  );
}

function SidebarLinkItem({
  item,
  className,
}: {
  item: Exclude<LinkItemType, { type: 'icon' }>;
  className?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  switch (item.type) {
    case 'custom':
      return <div className={className}>{item.children}</div>;
    case 'menu': {
      const rightIcon = (
        <ChevronDown
          className={cn(
            'ms-auto text-fd-muted-foreground size-3.5! transition-transform',
            !open && '-rotate-90',
          )}
        />
      );

      return (
        <Collapsible
          open={open}
          onOpenChange={setOpen}
          className={cn('mt-4 first:mt-0', className)}
        >
          {item.url ? (
            <div className="flex w-full px-2.5 py-1.5 font-medium">
              <Link
                href={item.url}
                external={item.external}
                className={cn(
                  'inline-flex items-center gap-2 [&_svg]:size-4',
                  isLinkItemActive(item, pathname)
                    ? 'text-fd-primary'
                    : 'hover:underline hover:decoration-fd-muted-foreground hover:underline-offset-4 hover:decoration-dashed hover:text-fd-accent-foreground',
                )}
                onClick={() => {
                  drawerHandle.close();
                }}
              >
                {item.icon}
                {item.text}
              </Link>
              <CollapsibleTrigger className="flex-1">{rightIcon}</CollapsibleTrigger>
            </div>
          ) : (
            <CollapsibleTrigger className="w-full px-2.5 py-1.5 font-medium inline-flex items-center gap-2 [&_svg]:size-4">
              {item.icon}
              {item.text}
              {rightIcon}
            </CollapsibleTrigger>
          )}

          <CollapsibleContent className="flex flex-col">
            {item.items.map((item, i) => (
              <SidebarLinkItem key={i} item={item} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      );
    }
    default:
      return (
        <Link
          href={item.url}
          external={item.external}
          className={cn(
            itemTriggerVariants({
              active: isLinkItemActive(item, pathname),
              className,
            }),
          )}
          onClick={() => {
            drawerHandle.close();
          }}
        >
          {item.icon}
          {item.text}
        </Link>
      );
  }
}

function renderNode(node: PageTree.Node) {
  if (node.type === 'page') return <SidebarItem item={node} />;
  if (node.type === 'folder') return <SidebarFolder folder={node} />;

  return (
    <p className="mt-4 w-full px-2.5 py-1.5 font-medium inline-flex items-center gap-2 [&_svg]:size-4 empty:hidden first:mt-0">
      {node.icon}
      {node.name}
    </p>
  );
}

function SidebarItem({ item }: { item: PageTree.Item }) {
  const path = useTreePath();
  return (
    <Link
      href={item.url}
      external={item.external}
      className={itemTriggerVariants({
        active: isNodeInPath(item, path),
      })}
      onClick={() => {
        drawerHandle.close();
      }}
    >
      {item.icon}
      {item.name}
    </Link>
  );
}

function SidebarFolder({ folder }: { folder: PageTree.Folder }) {
  const path = useTreePath();
  const shouldOpen = (folder.defaultOpen ?? true) || isNodeInPath(folder, path);
  const [open, setOpen] = useState(shouldOpen);

  useOnChange(shouldOpen, () => shouldOpen && setOpen(true));
  if (folder.collapsible === false) {
    return (
      <>
        {folder.index ? (
          <Link
            href={folder.index.url}
            external={folder.index.external}
            className={cn(
              'inline-flex px-2.5 py-1.5 font-medium items-center gap-2 [&_svg]:size-4 mt-4 first:mt-0',
              isNodeInPath(folder.index, path)
                ? 'text-fd-primary'
                : 'hover:underline hover:decoration-fd-muted-foreground hover:underline-offset-4 hover:decoration-dashed hover:text-fd-accent-foreground',
            )}
            onClick={() => {
              drawerHandle.close();
            }}
          >
            {folder.icon}
            {folder.name}
          </Link>
        ) : (
          <div className="w-full px-3 py-1.5 font-medium inline-flex items-center gap-2 [&_svg]:size-4 mt-4 first:mt-0">
            {folder.icon}
            {folder.name}
          </div>
        )}
        {folder.children.map((item, i) => cloneElement(renderNode(item), { key: i }))}
      </>
    );
  }

  const rightIcon = (
    <ChevronDown
      className={cn(
        'ms-auto text-fd-muted-foreground size-3.5! transition-transform',
        !open && '-rotate-90',
      )}
    />
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-4 first:mt-0">
      {folder.index ? (
        <div className="flex w-full px-2.5 py-1.5 font-medium">
          <Link
            href={folder.index.url}
            external={folder.index.external}
            className={cn(
              'inline-flex items-center gap-2 [&_svg]:size-4',
              isNodeInPath(folder.index, path)
                ? 'text-fd-primary'
                : 'hover:underline hover:decoration-fd-muted-foreground hover:underline-offset-4 hover:decoration-dashed hover:text-fd-accent-foreground',
            )}
            onClick={() => {
              drawerHandle.close();
            }}
          >
            {folder.icon}
            {folder.name}
          </Link>
          <CollapsibleTrigger className="flex-1">{rightIcon}</CollapsibleTrigger>
        </div>
      ) : (
        <CollapsibleTrigger className="w-full px-2.5 py-1.5 font-medium inline-flex items-center gap-2 [&_svg]:size-4">
          {folder.icon}
          {folder.name}
          {rightIcon}
        </CollapsibleTrigger>
      )}

      <CollapsibleContent className="flex flex-col">
        {folder.children.map((item, i) => cloneElement(renderNode(item), { key: i }))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function isNodeInPath(node: PageTree.Node, path: PageTree.Node[]) {
  return path.some((other) => other.$id === node.$id || other === node);
}
