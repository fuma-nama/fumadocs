'use client';

import { SidebarTrigger } from 'fumadocs-core/sidebar';
import { Menu, SidebarIcon, X } from 'lucide-react';
import { useCallback } from 'react';
import { useSidebar } from '@/contexts/sidebar';
import { useSearchContext } from '@/contexts/search';
import { SearchToggle } from '@/components/layout/search-toggle';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/theme/variants';
import type { SharedNavProps } from '@/layout.shared';
import { NavBox, Title } from '@/components/layout/nav';

export function SubNav({
  title,
  url,
  transparentMode,
  children,
  enableSearch = true,
}: SharedNavProps): React.ReactElement {
  const { open } = useSidebar();
  const { enabled } = useSearchContext();

  return (
    <NavBox
      id="nd-subnav"
      className="flex h-14 flex-row items-center px-4 md:hidden"
      transparentMode={transparentMode}
    >
      <Title url={url} title={title} />
      <div className="flex flex-1 flex-row items-center">{children}</div>
      {enabled && enableSearch ? <SearchToggle /> : null}
      <SidebarTrigger
        className={cn(
          buttonVariants({
            color: 'ghost',
            size: 'icon',
            className: '-me-2',
          }),
        )}
      >
        {open ? <X /> : <Menu />}
      </SidebarTrigger>
    </NavBox>
  );
}

export function SidebarCollapseTrigger(): React.ReactElement {
  const { setCollapsed } = useSidebar();

  return (
    <button
      type="button"
      aria-label="Collapse Sidebar"
      className={cn(
        buttonVariants({
          color: 'ghost',
          size: 'icon',
          className: 'ms-auto max-md:hidden',
        }),
      )}
      onClick={useCallback(() => {
        setCollapsed((prev) => !prev);
      }, [setCollapsed])}
    >
      <SidebarIcon />
    </button>
  );
}

export { LinksMenu } from '@/components/layout/link-item';
export { Sidebar } from './components/layout/sidebar';
export { TreeContextProvider } from './contexts/tree';
export { ThemeToggle } from './components/layout/theme-toggle';
