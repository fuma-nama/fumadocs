'use client';
import * as Base from '@/components/sidebar/base';
import { cn } from '@/utils/cn';
import { type ComponentProps, use } from 'react';
import { cva } from 'class-variance-authority';
import { LayoutContext } from './client';
import { createPageTreeRenderer } from '@/components/sidebar/page-tree';
import { createLinkItemRenderer } from '@/components/sidebar/link-item';

const itemVariants = cva(
  'relative flex flex-row items-center gap-2 rounded-lg p-2 text-start text-fd-muted-foreground wrap-anywhere transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        link: 'data-[active=true]:bg-fd-primary/10 data-[active=true]:text-fd-primary data-[active=true]:hover:transition-colors',
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
  className,
  children,
  ...props
}: ComponentProps<'aside'>) {
  const { navMode } = use(LayoutContext)!;
  return (
    <Base.SidebarContent
      aside={({ collapsed, hovered }) => ({
        className: cn(
          'sticky [grid-area:sidebar] flex flex-col items-end z-20 text-sm *:w-(--fd-sidebar-width) md:layout:[--fd-sidebar-width:268px] max-md:hidden',
          (navMode === 'auto' || collapsed) &&
            'data-[collapsed=true]:bg-fd-card data-[collapsed=true]:border-e',
          navMode === 'auto'
            ? 'top-(--fd-docs-row-1) h-[calc(var(--fd-docs-height)-var(--fd-docs-row-1))]'
            : 'top-(--fd-docs-row-2) h-[calc(var(--fd-docs-height)-var(--fd-docs-row-2))]',
          collapsed && [
            'fixed start-0 inset-y-2 h-auto rounded-xl border transition-[opacity,translate] duration-200',
            hovered
              ? 'z-50 shadow-lg translate-x-2 rtl:-translate-x-2'
              : 'opacity-0 -translate-x-[calc(100%-16px)] rtl:translate-x-[calc(100%-16px)]',
          ],
          className,
        ),
      })}
      {...props}
    >
      {children}
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
      className={cn(itemVariants({ variant: 'link' }), className)}
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
  const depth = Base.useFolderDepth();

  return (
    <Base.SidebarFolderTrigger
      className={cn(itemVariants(), 'w-full', className)}
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
      className={cn(itemVariants({ variant: 'link' }), 'w-full', className)}
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
        depth === 1 && [
          "before:content-[''] before:absolute before:w-px before:inset-y-1 before:bg-fd-border before:start-2.5",
          "**:data-[active=true]:before:content-[''] **:data-[active=true]:before:bg-fd-primary **:data-[active=true]:before:absolute **:data-[active=true]:before:w-px **:data-[active=true]:before:inset-y-2.5 **:data-[active=true]:before:start-2.5",
        ],
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
