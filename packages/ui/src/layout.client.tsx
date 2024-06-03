'use client';

import { usePathname } from 'next/navigation';
import { type HTMLAttributes, useMemo } from 'react';
import { SidebarTrigger } from 'fumadocs-core/sidebar';
import { Menu } from 'lucide-react';
import { useTreeContext } from '@/contexts/tree';
import { cn } from '@/utils/cn';
import { useSidebar } from '@/contexts/sidebar';

export { TreeContextProvider } from './contexts/tree';
export { Nav } from './components/layout/nav';
export { Sidebar } from './components/layout/sidebar';
export { DynamicSidebar } from './components/layout/dynamic-sidebar';

export function BottomNav(): React.ReactElement {
  const ctx = useTreeContext();
  const pathname = usePathname();
  const page = useMemo(() => {
    return ctx.navigation.find((s) => s.url === pathname);
  }, [pathname, ctx.navigation]);

  return (
    <SidebarTrigger className="sticky bottom-0 z-50 inline-flex h-14 w-full items-center gap-2 border bg-card px-4 text-sm font-medium data-[open=true]:fixed md:hidden [&_svg]:size-5">
      {page?.icon}
      {page?.name}
      <Menu className="ms-auto size-5 text-muted-foreground" />
    </SidebarTrigger>
  );
}

export function Container(
  props: HTMLAttributes<HTMLDivElement>,
): React.ReactElement {
  const { collapsed } = useSidebar();

  return (
    <div
      {...props}
      className={cn(
        'flex flex-row justify-center lg:pr-[220px] xl:px-[260px]',
        !collapsed && 'md:pl-[240px]',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}
