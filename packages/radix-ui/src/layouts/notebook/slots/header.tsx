'use client';
import { ChevronDown, Languages, Sidebar as SidebarIcon } from 'lucide-react';
import {
  Fragment,
  type HTMLAttributes,
  type PointerEvent,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { LinkItem, type LinkItemType, type MenuItemType } from '@/layouts/shared';
import { useNotebookLayout } from '../client';
import { type LayoutTab, isLayoutTabActive } from '@/layouts/shared';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { usePathname } from 'fumadocs-core/framework';
import Link from 'fumadocs-core/link';

export function Header(props: ComponentProps<'header'>) {
  const {
    slots,
    navItems,
    isNavTransparent,
    props: { tabMode, nav, tabs, sidebar },
  } = useNotebookLayout();
  const { open } = slots.sidebar?.useSidebar?.() ?? {};
  const navMode = nav?.mode ?? 'auto';
  const sidebarCollapsible = sidebar.collapsible ?? true;
  const showLayoutTabs = tabMode === 'navbar' && tabs.length > 0;

  if (nav?.component) return nav.component;

  return (
    <header
      id="nd-subnav"
      data-transparent={isNavTransparent && !open}
      {...props}
      className={cn(
        'sticky [grid-area:header] flex flex-col top-(--fd-docs-row-1) z-10 backdrop-blur-sm transition-colors data-[transparent=false]:bg-fd-background/80 layout:[--fd-header-height:--spacing(14)]',
        showLayoutTabs && 'lg:layout:[--fd-header-height:--spacing(24)]',
        props.className,
      )}
    >
      <div data-header-body="" className="flex border-b px-4 gap-2 h-14 md:px-6">
        <div
          className={cn(
            'items-center',
            navMode === 'top' && 'flex flex-1',
            navMode === 'auto' && 'hidden has-data-[collapsed=true]:md:flex max-md:flex',
          )}
        >
          {sidebarCollapsible && slots.sidebar && navMode === 'auto' && (
            <slots.sidebar.collapseTrigger
              className={cn(
                buttonVariants({
                  color: 'ghost',
                  size: 'icon-sm',
                }),
                'text-fd-muted-foreground data-[collapsed=false]:hidden max-md:hidden',
              )}
            >
              <SidebarIcon />
            </slots.sidebar.collapseTrigger>
          )}
          {slots.navTitle && (
            <slots.navTitle
              className={cn(
                'inline-flex items-center gap-2.5 font-semibold',
                navMode === 'auto' && 'md:hidden',
              )}
            />
          )}
          {nav?.children}
        </div>
        {slots.searchTrigger && (
          <slots.searchTrigger.full
            hideIfDisabled
            className={cn(
              'w-full my-auto max-md:hidden',
              navMode === 'top' ? 'ps-2.5 rounded-xl max-w-sm' : 'max-w-[240px]',
            )}
          />
        )}
        <div className="flex flex-1 items-center justify-end md:gap-2">
          <div className="flex items-center gap-6 empty:hidden max-lg:hidden">
            {navItems
              .filter((item) => item.type !== 'icon')
              .map((item, i) => (
                <NavbarLinkItem key={i} item={item} />
              ))}
          </div>
          {navItems
            .filter((item) => item.type === 'icon')
            .map((item, i) => (
              <LinkItem
                key={i}
                item={item}
                className={cn(
                  buttonVariants({ size: 'icon-sm', color: 'ghost' }),
                  'text-fd-muted-foreground max-lg:hidden',
                )}
                aria-label={item.label}
              >
                {item.icon}
              </LinkItem>
            ))}

          <div className="flex items-center md:hidden">
            {slots.searchTrigger && <slots.searchTrigger.sm hideIfDisabled className="p-2" />}
            {slots.sidebar && (
              <slots.sidebar.trigger
                className={cn(
                  buttonVariants({
                    color: 'ghost',
                    size: 'icon-sm',
                    className: 'p-2 -me-1.5',
                  }),
                )}
              >
                <SidebarIcon />
              </slots.sidebar.trigger>
            )}
          </div>

          <div className="flex items-center gap-2 max-md:hidden">
            {slots.languageSelect && (
              <slots.languageSelect.root>
                <Languages className="size-4.5 text-fd-muted-foreground" />
              </slots.languageSelect.root>
            )}
            {slots.themeSwitch && <slots.themeSwitch />}
            {sidebarCollapsible && slots.sidebar && navMode === 'top' && (
              <slots.sidebar.collapseTrigger
                className={cn(
                  buttonVariants({
                    color: 'secondary',
                    size: 'icon-sm',
                  }),
                  'text-fd-muted-foreground rounded-full -me-1.5',
                )}
              >
                <SidebarIcon />
              </slots.sidebar.collapseTrigger>
            )}
          </div>
        </div>
      </div>
      {showLayoutTabs && (
        <LayoutHeaderTabs
          data-header-tabs=""
          className="overflow-x-auto border-b px-6 h-10 max-lg:hidden"
          tabs={tabs}
        />
      )}
    </header>
  );
}

function LayoutHeaderTabs({
  tabs,
  className,
  ...props
}: ComponentProps<'div'> & {
  tabs: LayoutTab[];
}) {
  const pathname = usePathname();
  const selectedIdx = useMemo(() => {
    return tabs.findLastIndex((option) => isLayoutTabActive(option, pathname));
  }, [tabs, pathname]);

  return (
    <div className={cn('flex flex-row items-end gap-6', className)} {...props}>
      {tabs.map((option, i) => {
        const { title, url, unlisted, props: { className, ...rest } = {} } = option;
        const isSelected = selectedIdx === i;

        return (
          <Link
            key={i}
            href={url}
            className={cn(
              'inline-flex border-b-2 border-transparent transition-colors items-center pb-1.5 font-medium gap-2 text-fd-muted-foreground text-sm text-nowrap hover:text-fd-accent-foreground',
              unlisted && !isSelected && 'hidden',
              isSelected && 'border-fd-primary text-fd-primary',
              className,
            )}
            {...rest}
          >
            {title}
          </Link>
        );
      })}
    </div>
  );
}

function NavbarLinkItem({
  item,
  className,
  ...props
}: { item: LinkItemType } & HTMLAttributes<HTMLElement>) {
  if (item.type === 'custom') return item.children;

  if (item.type === 'menu') {
    return <NavbarLinkItemMenu item={item} className={className} {...props} />;
  }

  return (
    <LinkItem
      item={item}
      className={cn(
        'text-sm text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground data-[active=true]:text-fd-primary',
        className,
      )}
      {...props}
    >
      {item.text}
    </LinkItem>
  );
}

function NavbarLinkItemMenu({
  item,
  hoverDelay = 50,
  className,
  ...props
}: { item: MenuItemType; hoverDelay?: number } & HTMLAttributes<HTMLElement>) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<number>(null);
  const freezeUntil = useRef<number>(null);

  const delaySetOpen = (value: boolean) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    timeoutRef.current = window.setTimeout(() => {
      setOpen(value);
      freezeUntil.current = Date.now() + 300;
    }, hoverDelay);
  };
  const onPointerEnter = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    delaySetOpen(true);
  };
  const onPointerLeave = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    delaySetOpen(false);
  };
  function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        if (freezeUntil.current === null || Date.now() >= freezeUntil.current) setOpen(value);
      }}
    >
      <PopoverTrigger
        className={cn(
          'inline-flex items-center gap-1.5 p-1 text-sm text-fd-muted-foreground transition-colors has-data-[active=true]:text-fd-primary data-[state=open]:text-fd-accent-foreground focus-visible:outline-none',
          className,
        )}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        {...props}
      >
        {item.url ? <LinkItem item={item as never}>{item.text}</LinkItem> : item.text}
        <ChevronDown className="size-3" />
      </PopoverTrigger>
      <PopoverContent
        className="flex flex-col p-1 text-fd-muted-foreground text-start"
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        {item.items.map((child, i) => {
          if (child.type === 'custom') return <Fragment key={i}>{child.children}</Fragment>;

          return (
            <LinkItem
              key={i}
              item={child}
              className="inline-flex items-center gap-2 rounded-md p-2 transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground data-[active=true]:text-fd-primary [&_svg]:size-4"
              onClick={() => {
                if (isTouchDevice()) setOpen(false);
              }}
            >
              {child.icon}
              {child.text}
            </LinkItem>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
