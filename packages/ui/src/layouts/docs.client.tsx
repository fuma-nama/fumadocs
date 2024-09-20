'use client';

import { SidebarTrigger } from 'fumadocs-core/sidebar';
import { Menu, SidebarIcon, X } from 'lucide-react';
import { ButtonHTMLAttributes, HTMLAttributes, useCallback } from 'react';
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
  enableSearch = true,
  ...props
}: SharedNavProps &
  Omit<HTMLAttributes<HTMLElement>, 'title'>): React.ReactElement {
  const { open } = useSidebar();
  const search = useSearchContext();

  return (
    <NavBox
      id="nd-subnav"
      {...props}
      className={cn(
        'flex h-[var(--fd-nav-height)] flex-row items-center px-4',
        props.className,
      )}
    >
      <Title url={url} title={title} />
      <div className="flex flex-1 flex-row items-center gap-1">
        {props.children}
      </div>
      {search.enabled && enableSearch ? <SearchToggle /> : null}
      <SidebarTrigger
        className={cn(
          buttonVariants({
            color: 'ghost',
            size: 'icon',
            className: '-me-2 md:hidden',
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
export { RootToggle } from '@/components/layout/root-toggle';
export { Sidebar } from '@/components/layout/sidebar';
export { TreeContextProvider } from '@/contexts/tree';
export { ThemeToggle } from '@/components/layout/theme-toggle';
export { LanguageToggle } from '@/components/layout/language-toggle';
export { DynamicSidebar } from '@/components/layout/dynamic-sidebar';
