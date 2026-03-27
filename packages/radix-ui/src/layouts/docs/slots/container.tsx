'use client';

import { cn } from '@/utils/cn';
import { useEffect, useState, type ComponentProps } from 'react';
import { useDocsLayout } from '..';

export function Container(props: ComponentProps<'div'>) {
  const { slots } = useDocsLayout();
  const { collapsed } = slots.sidebar.useSidebar();
  const [previousCollapsed, setPreviousCollapsed] = useState(collapsed);
  const isCollapseChanged = previousCollapsed !== collapsed;

  // will only set data attribute for an instant
  useEffect(() => {
    if (isCollapseChanged) setPreviousCollapsed(collapsed);
  }, [collapsed, isCollapseChanged]);

  return (
    <div
      id="nd-docs-layout"
      data-sidebar-collapsed={collapsed}
      data-column-changed={isCollapseChanged}
      {...props}
      style={
        {
          gridTemplate: `"sidebar sidebar header toc toc"
"sidebar sidebar toc-popover toc toc"
"sidebar sidebar main toc toc" 1fr / minmax(min-content, 1fr) var(--fd-sidebar-col) minmax(0, calc(var(--fd-layout-width,97rem) - var(--fd-sidebar-width) - var(--fd-toc-width))) var(--fd-toc-width) minmax(min-content, 1fr)`,
          '--fd-docs-row-1': 'var(--fd-banner-height, 0px)',
          '--fd-docs-row-2': 'calc(var(--fd-docs-row-1) + var(--fd-header-height))',
          '--fd-docs-row-3': 'calc(var(--fd-docs-row-2) + var(--fd-toc-popover-height))',
          '--fd-sidebar-col': collapsed ? '0px' : 'var(--fd-sidebar-width)',
          ...props.style,
        } as object
      }
      className={cn(
        'grid overflow-x-clip min-h-(--fd-docs-height) [--fd-docs-height:100dvh] [--fd-header-height:0px] [--fd-toc-popover-height:0px] [--fd-sidebar-width:0px] [--fd-toc-width:0px] data-[column-changed=true]:transition-[grid-template-columns]',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}
