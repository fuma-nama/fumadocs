'use client';

import { SidebarTrigger } from 'fumadocs-core/sidebar';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/utils/cn';
import { useSidebar } from '@/contexts/sidebar';
import { SearchToggle } from '@/components/layout/search-toggle';
import { buttonVariants } from '@/theme/variants';
import type { NavProps } from '@/components/layout/nav';
import { useSearchContext } from '@/contexts/search';

export { TreeContextProvider } from './contexts/tree';
export { SidebarProvider } from './contexts/sidebar';
export { Nav } from './components/layout/nav';
export { Sidebar } from './components/layout/sidebar';
export { DynamicSidebar } from './components/layout/dynamic-sidebar';

export function SubNav({
  title,
  url = '/',
  enableSearch = true,
}: NavProps): React.ReactElement {
  const { open } = useSidebar();
  const { enabled } = useSearchContext();

  return (
    <nav
      id="nd-subnav"
      className="sticky top-0 z-40 flex h-16 w-full flex-row items-center border-b bg-background/80 px-4 backdrop-blur-md md:hidden [&_svg]:size-5"
    >
      <Link
        href={url}
        className="inline-flex flex-1 items-center gap-3 font-semibold"
      >
        {title}
      </Link>
      {enabled && enableSearch ? <SearchToggle /> : null}
      <SidebarTrigger
        className={cn(
          buttonVariants({
            color: 'ghost',
            size: 'icon',
          }),
        )}
      >
        {open ? <X /> : <Menu />}
      </SidebarTrigger>
    </nav>
  );
}
