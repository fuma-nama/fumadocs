'use client';
import { Drawer } from '@base-ui/react/drawer';
import type * as PageTree from 'fumadocs-core/page-tree';
import {
  getLayoutTabs,
  GetLayoutTabsOptions,
  GroupedLinkItems,
  IconItemType,
  isLayoutTabActive,
  isLinkItemActive,
  LinkItemType,
  useLinkItems,
  type BaseLayoutProps,
  type LayoutTab,
} from '@/layouts/shared';
import { TreeContextProvider, useTreeContext, useTreePath } from '@/contexts/tree';
import Link from 'fumadocs-core/link';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cloneElement, ComponentProps, ReactNode, useMemo, useState } from 'react';
import { cva } from 'class-variance-authority';
import {
  ChevronDown,
  ChevronsUpDown,
  LanguagesIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
  SidebarIcon,
  XIcon,
} from 'lucide-react';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import { cn } from '@/utils/cn';
import { ScrollArea, ScrollViewport } from '@/components/ui/scroll-area';
import { FullSearchTrigger, SearchTrigger } from '../shared/slots/search-trigger';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { buttonVariants } from '@/components/ui/button';
import { ThemeSwitch } from '../shared/slots/theme-switch';
import { LanguageSelect, LanguageSelectText } from '../shared/slots/language-select';
import { useI18n } from '@/contexts/i18n';
import { useTranslations } from '@fuma-translate/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePathname } from 'fumadocs-core/framework';

export interface PointerLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;
  tabs?: LayoutTab[] | GetLayoutTabsOptions | false;
  aiChat?: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
  };
}

const itemTriggerVariants = cva(
  'inline-flex text-sm items-center gap-2 rounded-lg px-3 py-2 md:py-1.5 [&_svg]:size-4 outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
  {
    variants: {
      active: {
        true: 'bg-fd-primary/10 text-fd-primary',
        false: 'text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground',
      },
    },
  },
);

const drawerHandle = Drawer.createHandle();

export function PointerLayout({
  tree,
  nav,
  tabs: defaultTabs,
  links: defaultLinks,
  children,
  githubUrl,
  aiChat,
}: PointerLayoutProps) {
  const banner =
    typeof nav?.title === 'function' ? (
      <nav.title />
    ) : (
      <Link href={nav?.url ?? '/'} className="inline-flex items-center font-semibold gap-2">
        {nav?.title}
      </Link>
    );
  const linkItems = useLinkItems({ links: defaultLinks, githubUrl });
  const tabs = useMemo(() => {
    if (Array.isArray(defaultTabs)) {
      return defaultTabs;
    }
    if (typeof defaultTabs === 'object') {
      return getLayoutTabs(tree, defaultTabs);
    }
    if (defaultTabs !== false) {
      return getLayoutTabs(tree);
    }
    return [];
  }, [tree, defaultTabs]);

  return (
    <TreeContextProvider tree={tree}>
      <div
        id="fd-pointer-layout"
        className="grid overflow-x-clip min-h-dvh [--page-col:900px] [--fd-left-width:0px] [--fd-right-width:0px] has-data-[fd-full=true]:[--page-col:1200px] md:[--fd-left-width:280px]"
        style={{
          gridTemplate: `"left left-margin main right-margin right" 1fr / var(--fd-left-width) minmax(0,1fr) minmax(0px, var(--page-col)) minmax(0,1fr) var(--fd-right-width)`,
        }}
      >
        <SidebarDrawer banner={banner} links={linkItems} />
        <Sidebar banner={banner} links={linkItems} />
        <Header tabs={tabs || undefined} aiChat={aiChat} />
        {children}
      </div>
    </TreeContextProvider>
  );
}

function SidebarDrawer({ banner, links }: { banner?: ReactNode; links: GroupedLinkItems }) {
  const { root } = useTreeContext();

  return (
    <Drawer.Root handle={drawerHandle} swipeDirection="right">
      <Drawer.Portal className="z-40">
        <Drawer.Backdrop className="[--bleed:3rem] fixed inset-0 min-h-dvh bg-fd-overlay backdrop-blur-sm opacity-[calc(1-var(--drawer-swipe-progress))] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:duration-0 data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] supports-[-webkit-touch-callout:none]:absolute" />
        <Drawer.Viewport className="[--viewport-padding:0px] supports-[-webkit-touch-callout:none]:[--viewport-padding:0.625rem] fixed inset-0 flex items-stretch justify-end p-(--viewport-padding)">
          <Drawer.Popup
            id="nd-mobile-sidebar"
            className="[--bleed:3rem] supports-[-webkit-touch-callout:none]:[--bleed:0px] overflow-hidden w-[360px] h-full max-w-[calc(100vw-3rem+var(--bleed))] pr-(--bleed) -mr-(--bleed) border-l bg-fd-background text-fd-foreground outline-none shadow-md touch-auto translate-x-(--drawer-swipe-movement-x) transition-transform duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:select-none data-ending-style:translate-x-[calc(100%-var(--bleed)+var(--viewport-padding)+2px)] data-starting-style:translate-x-[calc(100%-var(--bleed)+var(--viewport-padding)+2px)] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] supports-[-webkit-touch-callout:none]:border supports-[-webkit-touch-callout:none]:rounded-xl"
          >
            <Drawer.Content className="flex flex-col px-3 size-full overflow-y-auto overscroll-contain fd-scroll-container">
              <div className="sticky flex items-center top-0 py-2 bg-fd-background shadow-lg shadow-fd-background">
                <Drawer.Title className="px-3 flex-1">{banner}</Drawer.Title>

                <Drawer.Close
                  className={cn(
                    buttonVariants({ variant: 'secondary', size: 'icon-sm' }),
                    'rounded-full',
                  )}
                >
                  <XIcon />
                </Drawer.Close>
              </div>
              <div className="flex flex-col py-2 flex-1">
                {links.all.map(
                  (item, i) => item.type !== 'icon' && <SidebarLinkItem key={i} item={item} />,
                )}
                {root.children.map((item, i) => cloneElement(renderNode(item), { key: i }))}
              </div>
              <div className="flex items-center sticky bottom-0 bg-fd-background px-1.5 pt-2 pb-4 border-t mt-2 empty:hidden">
                {links.all.map(
                  (item, i) => item.type === 'icon' && <SidebarIconLinkItem key={i} item={item} />,
                )}
              </div>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function Sidebar({
  banner,
  links,
  footer,
}: {
  banner?: ReactNode;
  links: GroupedLinkItems;
  footer?: ReactNode;
}) {
  const { root } = useTreeContext();

  return (
    <aside
      id="nd-sidebar"
      className="sticky flex flex-col [grid-area:left] my-2 ms-2 z-20 top-2 border rounded-2xl bg-fd-popover/80 text-fd-popover-foreground shadow-md h-[calc(100dvh---spacing(4))] max-md:hidden"
    >
      <div className="flex items-center text-sm gap-2 ps-4 p-2 h-10 border-b border-fd-foreground/10">
        {banner}
        <ThemeSwitch className="ms-auto shrink-0 p-0 max-md:hidden" />
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <ScrollViewport className="flex flex-col p-2 [mask-image:linear-gradient(to_bottom,transparent,white_16px,white_calc(100%-16px),transparent))]">
          {links.all.map(
            (item, i) => item.type !== 'icon' && <SidebarLinkItem key={i} item={item} />,
          )}
          {root.children.map((item, i) => cloneElement(renderNode(item), { key: i }))}
        </ScrollViewport>
      </ScrollArea>
      <div className="flex items-center px-3.5 py-2 border-t mt-2 empty:hidden">
        {links.all.map(
          (item, i) => item.type === 'icon' && <SidebarIconLinkItem key={i} item={item} />,
        )}
      </div>
      {footer}
    </aside>
  );
}

function SidebarIconLinkItem({ item, className }: { item: IconItemType; className?: string }) {
  return (
    <Link
      href={item.url}
      external={item.external}
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
            <div className="flex w-full text-sm px-3 py-1.5 font-medium">
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
            <CollapsibleTrigger className="w-full text-sm px-3 py-1.5 font-medium inline-flex items-center gap-2 [&_svg]:size-4">
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

function Header({ tabs, aiChat }: { tabs?: LayoutTab[] } & Pick<PointerLayoutProps, 'aiChat'>) {
  const { locales } = useI18n();
  const t = useTranslations();
  const baseVariants =
    'rounded-full bg-fd-popover/80 text-fd-popover-foreground border backdrop-blur-sm shadow-md';

  return (
    <div className="sticky flex flex-row gap-2 [grid-area:left-margin/left-margin/right/right] z-20 px-4 md:top-0 md:pt-2 md:px-5 md:h-12 md:bg-linear-to-b md:from-fd-background max-md:bottom-0 max-md:mt-auto max-md:h-14 max-md:pb-4 max-md:bg-linear-to-t max-md:from-fd-background">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({
              variant: 'secondary',
              size: 'icon-sm',
            }),
            baseVariants,
            'size-10 shrink-0 data-popup-open:bg-fd-accent md:hidden',
          )}
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-48">
          {aiChat && (
            <DropdownMenuItem onClick={() => aiChat.onOpenChange(!aiChat.open)}>
              <MessageCircleIcon className="size-4 text-fd-muted-foreground" />
              Ask AI
            </DropdownMenuItem>
          )}
          <div className="flex items-center justify-between border-t mt-2 pt-2 p-1 gap-2 first:border-t-0 first:mt-0">
            {locales && locales.length > 0 && (
              <LanguageSelect className="flex-1">
                <LanguageSelectText />
                <ChevronsUpDown className="ms-auto size-3.5 text-fd-muted-foreground shrink-0" />
              </LanguageSelect>
            )}
            <ThemeSwitch className="p-0" />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {tabs && tabs.length > 0 && (
        <LayoutTabs tabs={tabs} className={cn(baseVariants, 'min-w-0 max-sm:flex-1')} />
      )}
      {locales && locales.length > 0 && (
        <LanguageSelect className={cn(baseVariants, 'px-3 rounded-full max-md:hidden')}>
          <LanguagesIcon className="size-4 text-fd-muted-foreground shrink-0" />
          <LanguageSelectText />
          <ChevronsUpDown className="size-3.5 text-fd-muted-foreground shrink-0" />
        </LanguageSelect>
      )}
      <SearchTrigger
        color="secondary"
        className={cn(baseVariants, 'ms-auto size-10 shrink-0 lg:hidden')}
      />
      <FullSearchTrigger
        className={cn(
          baseVariants,
          'ms-auto max-w-[280px] flex-1 text-fd-muted-foreground ps-3 pe-2.5 max-lg:hidden',
        )}
      />
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
          Ask AI
        </button>
      )}
      <Drawer.Trigger
        handle={drawerHandle}
        render={(props, { open }) => (
          <button
            {...props}
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'icon-sm' }),
              baseVariants,
              'shrink-0 size-10 md:hidden',
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

function LayoutTabs({
  tabs,
  className,
  ...props
}: { tabs: LayoutTab[] } & ComponentProps<typeof PopoverTrigger>) {
  const path = useTreePath();
  const pathname = usePathname();
  const t = useTranslations();
  const selected = tabs.findLast((t) => isLayoutTabActive(t, path, pathname));
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'inline-flex items-center gap-2 text-sm px-3 py-1 font-medium rounded-full transition-colors [&_svg]:size-4 hover:bg-fd-accent data-popup-open:bg-fd-accent',
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
      <PopoverContent className="flex flex-col p-1 w-(--anchor-width)" align="start">
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

function renderNode(node: PageTree.Node) {
  if (node.type === 'page') return <SidebarItem item={node} />;
  if (node.type === 'folder') return <SidebarFolder folder={node} />;

  return (
    <p className="mt-4 w-full text-sm px-3 py-1.5 font-medium inline-flex items-center gap-2 [&_svg]:size-4 empty:hidden first:mt-0">
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
              'inline-flex text-sm px-3 py-1.5 font-medium items-center gap-2 [&_svg]:size-4 mt-4 first:mt-0',
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
          <div className="w-full text-sm px-3 py-1.5 font-medium inline-flex items-center gap-2 [&_svg]:size-4 mt-4 first:mt-0">
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
        <div className="flex w-full text-sm px-3 py-1.5 font-medium">
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
        <CollapsibleTrigger className="w-full text-sm px-3 py-1.5 font-medium inline-flex items-center gap-2 [&_svg]:size-4">
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
