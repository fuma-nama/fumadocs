'use client';

import { cn } from '@/utils/cn';
import { useEffect, useState, type ComponentProps } from 'react';
import { useNotebookLayout } from '../client';

export function Container(props: ComponentProps<'div'>) {
  const {
    props: { nav },
    slots,
  } = useNotebookLayout();
  const pageCol =
    'calc(var(--fd-layout-width,97rem) - var(--fd-sidebar-col) - var(--fd-toc-width))';
  const { collapsed } = slots.sidebar?.useSidebar?.() ?? {};
  const [previousCollapsed, setPreviousCollapsed] = useState(collapsed);
  const isCollapseChanged = previousCollapsed !== collapsed;

  // will only set data attribute for an instant
  useEffect(() => {
    if (isCollapseChanged) setPreviousCollapsed(collapsed);
  }, [collapsed, isCollapseChanged]);

  return (
    <div
      id="nd-notebook-layout"
      data-sidebar-collapsed={collapsed}
      data-column-changed={isCollapseChanged}
      {...props}
      style={
        {
          gridTemplate:
            nav?.mode === 'top'
              ? `". header header header ."
"sidebar sidebar toc-popover toc-popover ."
"sidebar sidebar main toc ." 1fr / minmax(min-content, 1fr) var(--fd-sidebar-col) minmax(0, ${pageCol}) var(--fd-toc-width) minmax(min-content, 1fr)`
              : `"sidebar sidebar header header ."
"sidebar sidebar toc-popover toc-popover ."
"sidebar sidebar main toc ." 1fr / minmax(min-content, 1fr) var(--fd-sidebar-col) minmax(0, ${pageCol}) var(--fd-toc-width) minmax(min-content, 1fr)`,
          '--fd-docs-row-1': 'var(--fd-banner-height, 0px)',
          '--fd-docs-row-2': 'calc(var(--fd-docs-row-1) + var(--fd-header-height))',
          '--fd-docs-row-3': 'calc(var(--fd-docs-row-2) + var(--fd-toc-popover-height))',
          '--fd-sidebar-col': collapsed ? '0px' : 'var(--fd-sidebar-width)',
          ...props.style,
        } as object
      }
      className={cn(
        'grid overflow-x-clip min-h-(--fd-docs-height) auto-cols-auto auto-rows-auto [--fd-docs-height:100dvh] [--fd-header-height:0px] [--fd-toc-popover-height:0px] [--fd-sidebar-width:0px] [--fd-toc-width:0px] data-[column-changed=true]:transition-[grid-template-columns]',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}
