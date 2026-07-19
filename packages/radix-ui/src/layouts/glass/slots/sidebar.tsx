'use client';
import type * as PageTree from 'fumadocs-core/page-tree';
import { type IconItemType, isLinkItemActive, type LinkItemType } from '@/layouts/shared';
import { useTreeContext, useTreePath } from '@/contexts/tree';
import Link from 'fumadocs-core/link';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cloneElement, type ComponentProps, useState } from 'react';
import { cva } from 'class-variance-authority';
import { ChevronDown, XIcon } from 'lucide-react';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import { cn } from '@/utils/cn';
import { ScrollArea, ScrollViewport } from '@/components/ui/scroll-area';
import { buttonVariants } from '@/components/ui/button';
import { usePathname } from 'fumadocs-core/framework';
import { useTranslations } from '@fuma-translate/react';
import { SidebarDrawerContent, SidebarDrawerOverlay, useSidebar } from '@/components/sidebar/base';
import { useGlassLayout } from '..';

export type SidebarProps = ComponentProps<'aside'>;

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

export function SidebarDrawer() {
  const { menuItems, slots } = useGlassLayout();
  const { root } = useTreeContext();
  const { setOpen } = useSidebar();
  const t = useTranslations();

  return (
    <>
      <SidebarDrawerOverlay className="fixed z-40 inset-0 bg-fd-overlay backdrop-blur-sm data-[state=open]:animate-fd-fade-in data-[state=closed]:animate-fd-fade-out" />
      <SidebarDrawerContent className="fixed z-40 inset-e-0 inset-y-0 flex flex-col w-[360px] max-w-[calc(100vw-3rem)] border-s bg-fd-background text-fd-foreground shadow-md data-[state=open]:animate-fd-sidebar-in data-[state=closed]:animate-fd-sidebar-out">
        <div className="flex flex-col px-3 size-full overflow-y-auto overscroll-contain fd-scroll-container">
          <div className="sticky flex items-center top-0 py-2 bg-fd-background shadow-lg shadow-fd-background">
            <div className="px-3 flex-1">
              <slots.navTitle className="inline-flex items-center font-semibold gap-2" />
            </div>

            <button
              type="button"
              aria-label={t('Close Sidebar', { note: 'aria-label' })}
              onClick={() => setOpen(false)}
              className={cn(
                buttonVariants({ variant: 'secondary', size: 'icon-sm' }),
                'rounded-full',
              )}
            >
              <XIcon />
            </button>
          </div>
          <div className="flex flex-col py-2 flex-1">
            {menuItems.map(
              (item, i) => item.type !== 'icon' && <SidebarLinkItem key={i} item={item} />,
            )}
            {root.children.map((item, i) => cloneElement(renderNode(item), { key: i }))}
          </div>
          <div className="flex items-center sticky bottom-0 bg-fd-background px-1.5 pt-2 pb-4 border-t mt-2 empty:hidden">
            {menuItems.map(
              (item, i) => item.type === 'icon' && <SidebarIconLinkItem key={i} item={item} />,
            )}
          </div>
        </div>
      </SidebarDrawerContent>
    </>
  );
}

export function Sidebar({ className, children, ...props }: SidebarProps) {
  const { menuItems, slots } = useGlassLayout();
  const { root } = useTreeContext();

  return (
    <aside
      id="nd-sidebar"
      className={cn(
        'sticky flex flex-col [grid-area:left] my-2 ms-2 z-20 top-2 border rounded-2xl bg-fd-popover/80 text-fd-popover-foreground shadow-md h-[calc(100dvh---spacing(4))] max-md:hidden',
        className,
      )}
      {...props}
    >
      <div className="flex items-center text-sm gap-2 ps-4 p-2 h-10 border-b border-fd-foreground/10">
        <slots.navTitle className="inline-flex items-center font-semibold gap-2" />
        {slots.themeSwitch && <slots.themeSwitch className="ms-auto shrink-0 p-0 max-md:hidden" />}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <ScrollViewport className="flex flex-col p-2 [mask-image:linear-gradient(to_bottom,transparent,white_16px,white_calc(100%-16px),transparent))]">
          {menuItems.map(
            (item, i) => item.type !== 'icon' && <SidebarLinkItem key={i} item={item} />,
          )}
          {root.children.map((item, i) => cloneElement(renderNode(item), { key: i }))}
        </ScrollViewport>
      </ScrollArea>
      <div className="flex items-center px-3.5 py-2 border-t mt-2 empty:hidden">
        {menuItems.map(
          (item, i) => item.type === 'icon' && <SidebarIconLinkItem key={i} item={item} />,
        )}
      </div>
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
