'use client';

import { SidebarTrigger } from 'fumadocs-core/sidebar';
import { Menu, SidebarIcon, X } from 'lucide-react';
import { ButtonHTMLAttributes, useCallback } from 'react';
import { useSidebar } from '@/contexts/sidebar';
import { useSearchContext } from '@/contexts/search';
import { SearchToggle } from '@/components/layout/search-toggle';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { NavBox, Title } from '@/components/layout/nav';
import type { SharedNavProps } from './shared';

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

export function SidebarCollapseTrigger(
  props: ButtonHTMLAttributes<HTMLButtonElement>,
): React.ReactElement {
  const { setCollapsed } = useSidebar();

  return (
    <button
      type="button"
      aria-label="Collapse Sidebar"
      {...props}
      className={cn(
        buttonVariants({
          color: 'ghost',
          size: 'icon',
          className: props.className,
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

export { LinksMenu, LinkItem } from '@/components/layout/link-item';
export { Sidebar } from '@/components/layout/sidebar';
export { TreeContextProvider } from '@/contexts/tree';
export { ThemeToggle } from '@/components/layout/theme-toggle';
export { LanguageToggle } from '@/components/layout/language-toggle';
export { DynamicSidebar } from '@/components/layout/dynamic-sidebar';
