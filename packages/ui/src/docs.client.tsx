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
      className="flex h-16 flex-row items-center px-4 md:hidden"
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

export { LinksMenu } from '@/components/layout/links-menu';
export { Sidebar } from './components/layout/sidebar';
export { DynamicSidebar } from './components/layout/dynamic-sidebar';
export { TreeContextProvider } from './contexts/tree';
export { ThemeToggle } from './components/layout/theme-toggle';
