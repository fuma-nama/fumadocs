'use client';
import type { SharedNavProps } from '@/layouts/shared';
import { useSidebar } from '@/contexts/sidebar';
import { useContext } from 'react';
import { NavContext, Title } from '@/components/layout/nav';
import { useSearchContext } from '@/contexts/search';
import { cn } from '@/utils/cn';
import { SearchToggle } from '@/components/layout/search-toggle';
import { SidebarTrigger } from 'fumadocs-core/sidebar';
import { buttonVariants } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export function DocsNavbar({
  title,
  url,
  enableSearch = true,
  ...props
}: Omit<SharedNavProps, 'transparentMode'> & {
  className?: string;
}) {
  const { open } = useSidebar();
  const { isTransparent } = useContext(NavContext);
  const search = useSearchContext();

  return (
    <header
      id="nd-subnav"
      {...props}
      className={cn(
        'sticky top-[var(--fd-banner-height)] z-40 flex flex-row items-center border-b border-fd-foreground/10 px-4 transition-colors',
        (!isTransparent || open) && 'bg-fd-background/80 backdrop-blur-lg',
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
    </header>
  );
}
