'use client';

import * as Base from '@/components/sidebar/base';
import { cn } from '@/utils/cn';
import { type ComponentProps, createElement, type FC, type ReactNode, useRef } from 'react';
import { cva } from 'class-variance-authority';
import { createPageTreeRenderer, type SidebarPageTreeComponents } from '@/components/sidebar/page-tree';
import { createLinkItemRenderer } from '@/components/sidebar/link-item';
import { buttonVariants } from '@/components/ui/button';
import { mergeRefs } from '@/utils/merge-refs';
import { ScrollArea, ScrollViewport } from '@/components/ui/scroll-area';
import { SidebarTabsDropdown } from '@/components/sidebar/tabs/dropdown';
import { LinkItem } from '@/utils/link-item';
import { Languages, Sidebar as SidebarIcon, X } from 'lucide-react';
import { useNotebookLayout } from '../client';

const itemVariants = cva(
  'relative flex flex-row items-center gap-2 rounded-lg p-2 text-start text-fd-muted-foreground wrap-anywhere [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        link: 'transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none data-[active=true]:bg-fd-primary/10 data-[active=true]:text-fd-primary data-[active=true]:hover:transition-colors',
        button:
          'transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none',
      },
      highlight: {
        true: "data-[active=true]:before:content-[''] data-[active=true]:before:bg-fd-primary data-[active=true]:before:absolute data-[active=true]:before:w-px data-[active=true]:before:inset-y-2.5 data-[active=true]:before:start-2.5",
      },
    },
  },
);

function getItemOffset(depth: number) {
  return `calc(${2 + 3 * depth} * var(--spacing))`;
}

export interface SidebarProps extends ComponentProps<'aside'> {
  components?: Partial<SidebarPageTreeComponents>;
  banner?: ReactNode | FC<ComponentProps<'div'>>;
  footer?: ReactNode | FC<ComponentProps<'div'>>;
  /**
   * Support collapsing the sidebar on desktop mode
   *
   * @defaultValue true
   */
  collapsible?: boolean;
}

export type SidebarProviderProps = Base.SidebarProviderProps;

export function SidebarProvider(props: SidebarProviderProps) {
  return <Base.SidebarProvider {...props} />;
}

export function SidebarTrigger(props: ComponentProps<'button'>) {
  return <Base.SidebarTrigger {...props} />;
}

export function SidebarCollapseTrigger(props: ComponentProps<'button'>) {
  return <Base.SidebarCollapseTrigger {...props} />;
}

function SidebarViewport(props: ComponentProps<typeof ScrollArea>) {
  return (
    <ScrollArea {...props} className={cn('min-h-0 flex-1', props.className)}>
      <ScrollViewport
        className="p-4 overscroll-contain"
        style={
          {
            maskImage:
              'linear-gradient(to bottom, transparent, white 12px, white calc(100% - 12px), transparent)',
          } as object
        }
      >
        {props.children}
      </ScrollViewport>
    </ScrollArea>
  );
}

function SidebarContent({
  ref: refProp,
  className,
  children,
  ...props
}: ComponentProps<'aside'>) {
  const { navMode } = useNotebookLayout();
  const ref = useRef<HTMLElement>(null);

  return (
    <Base.SidebarContent>
      {({ collapsed, hovered, ref: asideRef, ...rest }) => (
        <div
          data-sidebar-placeholder=""
          className={cn(
            'sticky z-20 [grid-area:sidebar] pointer-events-none *:pointer-events-auto md:layout:[--fd-sidebar-width:268px] max-md:hidden',
            navMode === 'auto'
              ? 'top-(--fd-docs-row-1) h-[calc(var(--fd-docs-height)-var(--fd-docs-row-1))]'
              : 'top-(--fd-docs-row-2) h-[calc(var(--fd-docs-height)-var(--fd-docs-row-2))]',
          )}
        >
          {collapsed && <div className="absolute start-0 inset-y-0 w-4" {...rest} />}
          <aside
            id="nd-sidebar"
            ref={mergeRefs(ref, refProp, asideRef)}
            data-collapsed={collapsed}
            data-hovered={collapsed && hovered}
            className={cn(
              'absolute flex flex-col w-full start-0 inset-y-0 items-end text-sm duration-250 *:w-(--fd-sidebar-width)',
              navMode === 'auto' && 'bg-fd-card border-e',
              collapsed && [
                'inset-y-2 rounded-xl bg-fd-card transition-transform border w-(--fd-sidebar-width)',
                hovered
                  ? 'shadow-lg translate-x-2 rtl:-translate-x-2'
                  : '-translate-x-(--fd-sidebar-width) rtl:translate-x-full',
              ],
              ref.current &&
                (ref.current.getAttribute('data-collapsed') === 'true') !== collapsed &&
                'transition-[width,inset-block,translate,background-color]',
              className,
            )}
            {...props}
            {...rest}
          >
            {children}
          </aside>
        </div>
      )}
    </Base.SidebarContent>
  );
}

function SidebarDrawer({
  children,
  className,
  ...props
}: ComponentProps<typeof Base.SidebarDrawerContent>) {
  return (
    <>
      <Base.SidebarDrawerOverlay className="fixed z-40 inset-0 backdrop-blur-xs data-[state=open]:animate-fd-fade-in data-[state=closed]:animate-fd-fade-out" />
      <Base.SidebarDrawerContent
        className={cn(
          'fixed text-[0.9375rem] flex flex-col shadow-lg border-s end-0 inset-y-0 w-[85%] max-w-[380px] z-40 bg-fd-background data-[state=open]:animate-fd-sidebar-in data-[state=closed]:animate-fd-sidebar-out',
          className,
        )}
        {...props}
      >
        {children}
      </Base.SidebarDrawerContent>
    </>
  );
}

function SidebarFolder(props: ComponentProps<typeof Base.SidebarFolder>) {
  return <Base.SidebarFolder {...props} />;
}

function SidebarSeparator({ className, style, children, ...props }: ComponentProps<'p'>) {
  const depth = Base.useFolderDepth();

  return (
    <Base.SidebarSeparator
      className={cn(
        'inline-flex items-center gap-2 mb-1.5 px-2 mt-6 empty:mb-0 [&_svg]:size-4 [&_svg]:shrink-0',
        depth === 0 && 'first:mt-0',
        className,
      )}
      style={{
        paddingInlineStart: getItemOffset(depth),
        ...style,
      }}
      {...props}
    >
      {children}
    </Base.SidebarSeparator>
  );
}

function SidebarItem({ className, style, children, ...props }: ComponentProps<typeof Base.SidebarItem>) {
  const depth = Base.useFolderDepth();

  return (
    <Base.SidebarItem
      className={cn(itemVariants({ variant: 'link', highlight: depth >= 1 }), className)}
      style={{
        paddingInlineStart: getItemOffset(depth),
        ...style,
      }}
      {...props}
    >
      {children}
    </Base.SidebarItem>
  );
}

function SidebarFolderTrigger({
  className,
  style,
  ...props
}: ComponentProps<typeof Base.SidebarFolderTrigger>) {
  const { depth, collapsible } = Base.useFolder()!;

  return (
    <Base.SidebarFolderTrigger
      className={cn(itemVariants({ variant: collapsible ? 'button' : null }), 'w-full', className)}
      style={{
        paddingInlineStart: getItemOffset(depth - 1),
        ...style,
      }}
      {...props}
    >
      {props.children}
    </Base.SidebarFolderTrigger>
  );
}

function SidebarFolderLink({
  className,
  style,
  ...props
}: ComponentProps<typeof Base.SidebarFolderLink>) {
  const depth = Base.useFolderDepth();

  return (
    <Base.SidebarFolderLink
      className={cn(itemVariants({ variant: 'link', highlight: depth > 1 }), 'w-full', className)}
      style={{
        paddingInlineStart: getItemOffset(depth - 1),
        ...style,
      }}
      {...props}
    >
      {props.children}
    </Base.SidebarFolderLink>
  );
}

function SidebarFolderContent({
  className,
  children,
  ...props
}: ComponentProps<typeof Base.SidebarFolderContent>) {
  const depth = Base.useFolderDepth();

  return (
    <Base.SidebarFolderContent
      className={cn(
        'relative',
        depth === 1 &&
          "before:content-[''] before:absolute before:w-px before:inset-y-1 before:bg-fd-border before:start-2.5",
        className,
      )}
      {...props}
    >
      {children}
    </Base.SidebarFolderContent>
  );
}

const SidebarPageTree = createPageTreeRenderer({
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
  SidebarSeparator,
});

const SidebarLinkItem = createLinkItemRenderer({
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
});

export function Sidebar({
  banner,
  footer,
  components,
  collapsible = true,
  ...rest
}: SidebarProps) {
  const {
    tabs,
    menuItems,
    slots,
    tabMode,
    navMode,
    props: { nav },
  } = useNotebookLayout();
  const iconLinks = menuItems.filter((item) => item.type === 'icon');

  function renderHeader(props: ComponentProps<'div'>) {
    if (typeof banner === 'function') return createElement(banner, props);

    return (
      <div {...props} className={cn('flex flex-col gap-3 p-4 pb-2 empty:hidden', props.className)}>
        {props.children}
        {banner}
      </div>
    );
  }

  function renderFooter(props: ComponentProps<'div'>) {
    if (typeof footer === 'function') return createElement(footer, props);

    return (
      <div
        {...props}
        className={cn(
          'hidden flex-row text-fd-muted-foreground items-center border-t p-4 pt-2',
          iconLinks.length > 0 && 'max-lg:flex',
          props.className,
        )}
      >
        {props.children}
        {footer}
      </div>
    );
  }

  const viewport = (
    <SidebarViewport>
      {menuItems
        .filter((item) => item.type !== 'icon')
        .map((item, i, arr) => (
          <SidebarLinkItem
            key={i}
            item={item}
            className={cn('lg:hidden', i === arr.length - 1 && 'mb-4')}
          />
        ))}
      <SidebarPageTree {...components} />
    </SidebarViewport>
  );

  return (
    <>
      <SidebarContent {...rest}>
        {renderHeader({
          children: (
            <>
              {navMode === 'auto' && (
                <div className="flex justify-between">
                  {slots.navTitle && (
                    <slots.navTitle className="inline-flex items-center gap-2.5 font-medium" />
                  )}
                  {nav?.children}
                  {collapsible && (
                    <SidebarCollapseTrigger
                      className={cn(
                        buttonVariants({
                          color: 'ghost',
                          size: 'icon-sm',
                          className: 'mt-px mb-auto text-fd-muted-foreground',
                        }),
                      )}
                    >
                      <SidebarIcon />
                    </SidebarCollapseTrigger>
                  )}
                </div>
              )}
              {tabs.length > 0 && (
                <SidebarTabsDropdown options={tabs} className={cn(tabMode === 'navbar' && 'lg:hidden')} />
              )}
            </>
          ),
        })}
        {viewport}
        {renderFooter({
          children: iconLinks.map((item, i) => (
            <LinkItem
              key={i}
              item={item}
              className={cn(
                buttonVariants({
                  size: 'icon-sm',
                  color: 'ghost',
                  className: 'lg:hidden',
                }),
              )}
              aria-label={item.label}
            >
              {item.icon}
            </LinkItem>
          )),
        })}
      </SidebarContent>
      <SidebarDrawer {...rest}>
        {renderHeader({
          children: (
            <>
              <SidebarTrigger
                className={cn(
                  buttonVariants({
                    size: 'icon-sm',
                    color: 'ghost',
                    className: 'ms-auto text-fd-muted-foreground',
                  }),
                )}
              >
                <X />
              </SidebarTrigger>
              {tabs.length > 0 && <SidebarTabsDropdown options={tabs} />}
            </>
          ),
        })}
        {viewport}
        {renderFooter({
          className: cn(
            'hidden flex-row items-center justify-end',
            (slots.languageSelect || slots.themeSwitch) && 'flex',
            iconLinks.length > 0 && 'max-lg:flex',
          ),
          children: (
            <>
              {iconLinks.map((item, i) => (
                <LinkItem
                  key={i}
                  item={item}
                  className={cn(
                    buttonVariants({
                      size: 'icon-sm',
                      color: 'ghost',
                    }),
                    'text-fd-muted-foreground lg:hidden',
                    i === iconLinks.length - 1 && 'me-auto',
                  )}
                  aria-label={item.label}
                >
                  {item.icon}
                </LinkItem>
              ))}
              {slots.languageSelect && (
                <slots.languageSelect.root>
                  <Languages className="size-4.5 text-fd-muted-foreground" />
                </slots.languageSelect.root>
              )}
              {slots.themeSwitch && <slots.themeSwitch />}
            </>
          ),
        })}
      </SidebarDrawer>
    </>
  );
}
