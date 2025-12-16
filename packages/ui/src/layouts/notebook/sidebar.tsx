'use client';
import * as Base from '@/components/sidebar/base';
import { cn } from '@/utils/cn';
import { type ComponentProps, use, useRef } from 'react';
import { cva } from 'class-variance-authority';
import { LayoutContext } from './client';
import { createPageTreeRenderer } from '@/components/sidebar/page-tree';
import { createLinkItemRenderer } from '@/components/sidebar/link-item';
import { mergeRefs } from '@/utils/merge-refs';

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

export const {
  SidebarProvider: Sidebar,
  SidebarFolder,
  SidebarCollapseTrigger,
  SidebarViewport,
  SidebarTrigger,
} = Base;

export function SidebarContent({
  ref: refProp,
  className,
  children,
  ...props
}: ComponentProps<'aside'>) {
  const { navMode } = use(LayoutContext)!;
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
          {collapsed && (
            <div className="absolute start-0 inset-y-0 w-4" {...rest} />
          )}
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
                (ref.current.getAttribute('data-collapsed') === 'true') !==
                  collapsed &&
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

export function SidebarDrawer({
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

export function SidebarSeparator({
  className,
  style,
  children,
  ...props
}: ComponentProps<'p'>) {
  const depth = Base.useFolderDepth();

  return (
    <Base.SidebarSeparator
      className={cn('[&_svg]:size-4 [&_svg]:shrink-0', className)}
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

export function SidebarItem({
  className,
  style,
  children,
  ...props
}: ComponentProps<typeof Base.SidebarItem>) {
  const depth = Base.useFolderDepth();

  return (
    <Base.SidebarItem
      className={cn(
        itemVariants({ variant: 'link', highlight: depth >= 1 }),
        className,
      )}
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

export function SidebarFolderTrigger({
  className,
  style,
  ...props
}: ComponentProps<typeof Base.SidebarFolderTrigger>) {
  const { depth, collapsible } = Base.useFolder()!;

  return (
    <Base.SidebarFolderTrigger
      className={cn(
        itemVariants({ variant: collapsible ? 'button' : null }),
        'w-full',
        className,
      )}
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

export function SidebarFolderLink({
  className,
  style,
  ...props
}: ComponentProps<typeof Base.SidebarFolderLink>) {
  const depth = Base.useFolderDepth();

  return (
    <Base.SidebarFolderLink
      className={cn(
        itemVariants({ variant: 'link', highlight: depth > 1 }),
        'w-full',
        className,
      )}
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

export function SidebarFolderContent({
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
export const SidebarPageTree = createPageTreeRenderer({
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
  SidebarSeparator,
});

export const SidebarLinkItem = createLinkItemRenderer({
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
});
