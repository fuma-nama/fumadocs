'use client';

import Link from 'next/link';
import { SidebarTrigger } from 'fumadocs-core/sidebar';
import { Menu, X } from 'lucide-react';
import type { NavProps } from '@/components/layout/nav';
import { useSidebar } from '@/contexts/sidebar';
import { useSearchContext } from '@/contexts/search';
import { SearchToggle } from '@/components/layout/search-toggle';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/theme/variants';

export function SubNav({
  title,
  url = '/',
  children,
  enableSearch = true,
}: NavProps): React.ReactElement {
  const { open } = useSidebar();
  const { enabled } = useSearchContext();

  return (
    <nav
      id="nd-subnav"
      className="sticky top-0 z-40 flex h-16 w-full flex-row items-center border-b bg-background/50 px-4 backdrop-blur-md md:hidden [&_svg]:size-5"
    >
      <Link href={url} className="inline-flex items-center gap-3 font-semibold">
        {title}
      </Link>
      {children}
      {enabled && enableSearch ? <SearchToggle className="ml-auto" /> : null}
      <SidebarTrigger
        className={cn(
          buttonVariants({
            color: 'ghost',
            size: 'icon',
            className: (!enabled || !enableSearch) && 'ml-auto',
          }),
        )}
      >
        {open ? <X /> : <Menu />}
      </SidebarTrigger>
    </nav>
  );
}

export { Sidebar } from './components/layout/sidebar';
export { DynamicSidebar } from './components/layout/dynamic-sidebar';
export { TreeContextProvider } from './contexts/tree';
export { ThemeToggle } from './components/layout/theme-toggle';
