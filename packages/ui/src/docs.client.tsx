'use client';

import { SidebarTrigger } from 'fumadocs-core/sidebar';
import { Menu, X } from 'lucide-react';
import { useSidebar } from '@/contexts/sidebar';
import { useSearchContext } from '@/contexts/search';
import { SearchToggle } from '@/components/layout/search-toggle';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/theme/variants';
import type { SharedNavProps } from '@/layout';
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
      className="flex flex-row items-center px-4 md:hidden"
      transparentMode={transparentMode}
    >
      <Title url={url} title={title} />
      {children}
      {enabled && enableSearch ? <SearchToggle className="ms-auto" /> : null}
      <SidebarTrigger
        className={cn(
          buttonVariants({
            color: 'ghost',
            size: 'icon',
            className: (!enabled || !enableSearch) && 'ms-auto',
          }),
        )}
      >
        {open ? <X /> : <Menu />}
      </SidebarTrigger>
    </NavBox>
  );
}

export { LinksMenu } from '@/components/layout/links-menu';
export { Sidebar } from './components/layout/sidebar';
export { DynamicSidebar } from './components/layout/dynamic-sidebar';
export { TreeContextProvider } from './contexts/tree';
export { ThemeToggle } from './components/layout/theme-toggle';
