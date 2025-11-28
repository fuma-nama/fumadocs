'use client';
import * as Base from '@/components/sidebar/base';
import type * as PageTree from 'fumadocs-core/page-tree';
import { cn } from '@/utils/cn';
import {
  Fragment,
  type HTMLAttributes,
  useMemo,
  type ComponentProps,
  type FC,
  type ReactNode,
  use,
} from 'react';
import { useTreeContext, useTreePath } from '@/contexts/tree';
import type { LinkItemType } from '../shared/link-item';
import { cva } from 'class-variance-authority';
import { LayoutContext } from './client';

const itemVariants = cva([
  'relative flex flex-row items-center gap-2 rounded-lg p-2 text-start text-fd-muted-foreground wrap-anywhere [&_svg]:size-4 [&_svg]:shrink-0',
  'data-[active=true]:bg-fd-primary/10 data-[active=true]:text-fd-primary',
  'data-[active=false]:transition-colors data-[active=false]:hover:bg-fd-accent/50 data-[active=false]:hover:text-fd-accent-foreground/80 data-[active=false]:hover:transition-none',
]);

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
          'sticky [grid-area:sidebar] flex flex-col items-end z-20 text-sm *:w-(--fd-sidebar-width) max-md:hidden',
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
      className={cn(itemVariants(), className)}
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
      data-active={false}
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
      className={cn(itemVariants(), 'w-full', className)}
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

export interface SidebarComponents {
  Item: FC<{ item: PageTree.Item }>;
  Folder: FC<{ item: PageTree.Folder; level: number; children: ReactNode }>;
  Separator: FC<{ item: PageTree.Separator }>;
}

/**
 * Render sidebar items from page tree
 */
export function SidebarPageTree({
  components,
}: {
  components?: Partial<SidebarComponents>;
}) {
  const { root } = useTreeContext();
  return useMemo(() => {
    const { Separator, Item, Folder = PageTreeFolder } = components ?? {};

    function renderSidebarList(
      items: PageTree.Node[],
      level: number,
    ): ReactNode[] {
      return items.map((item, i) => {
        if (item.type === 'separator') {
          if (Separator) return <Separator key={i} item={item} />;
          return (
            <SidebarSeparator key={i} className={cn(i !== 0 && 'mt-6')}>
              {item.icon}
              {item.name}
            </SidebarSeparator>
          );
        }

        if (item.type === 'folder') {
          return (
            <Folder key={i} item={item} level={level}>
              {renderSidebarList(item.children, level + 1)}
            </Folder>
          );
        }

        if (Item) return <Item key={item.url} item={item} />;
        return (
          <SidebarItem
            key={item.url}
            href={item.url}
            external={item.external}
            icon={item.icon}
          >
            {item.name}
          </SidebarItem>
        );
      });
    }

    return (
      <Fragment key={root.$id}>{renderSidebarList(root.children, 1)}</Fragment>
    );
  }, [components, root]);
}

function PageTreeFolder({
  item,
  ...props
}: {
  item: PageTree.Folder;
  children: ReactNode;
}) {
  const path = useTreePath();

  return (
    <SidebarFolder
      defaultOpen={(value) =>
        (item.defaultOpen ?? value) || path.includes(item)
      }
    >
      {item.index ? (
        <SidebarFolderLink
          href={item.index.url}
          external={item.index.external}
          {...props}
        >
          {item.icon}
          {item.name}
        </SidebarFolderLink>
      ) : (
        <SidebarFolderTrigger {...props}>
          {item.icon}
          {item.name}
        </SidebarFolderTrigger>
      )}
      <SidebarFolderContent>{props.children}</SidebarFolderContent>
    </SidebarFolder>
  );
}

export function SidebarLinkItem({
  item,
  ...props
}: HTMLAttributes<HTMLElement> & {
  item: Exclude<LinkItemType, { type: 'icon' }>;
}) {
  if (item.type === 'custom') return <div {...props}>{item.children}</div>;

  if (item.type === 'menu')
    return (
      <SidebarFolder {...props}>
        {item.url ? (
          <SidebarFolderLink href={item.url} external={item.external}>
            {item.icon}
            {item.text}
          </SidebarFolderLink>
        ) : (
          <SidebarFolderTrigger>
            {item.icon}
            {item.text}
          </SidebarFolderTrigger>
        )}
        <SidebarFolderContent>
          {item.items.map((child, i) => (
            <SidebarLinkItem key={i} item={child} />
          ))}
        </SidebarFolderContent>
      </SidebarFolder>
    );

  return (
    <SidebarItem
      href={item.url}
      icon={item.icon}
      external={item.external}
      {...props}
    >
      {item.text}
    </SidebarItem>
  );
}
