'use client';

import { SidebarTrigger } from 'fumadocs-core/sidebar';
import { Menu, SidebarIcon, X } from 'lucide-react';
import {
  type ButtonHTMLAttributes,
  type ReactNode,
  useContext,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import { useSidebar } from '@/contexts/sidebar';
import { useSearchContext } from '@/contexts/search';
import { SearchToggle } from '@/components/layout/search-toggle';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { NavContext, Title } from '@/components/layout/nav';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { SharedNavProps } from './shared';

export function SubNav({
  title,
  url,
  enableSearch = true,
  ...props
}: Omit<SharedNavProps, 'transparentMode'> & {
  className?: string;
}): React.ReactElement {
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
        }),
        props.className,
      )}
      onClick={() => {
        setCollapsed((prev) => !prev);
      }}
    >
      <SidebarIcon />
    </button>
  );
}

interface LinksMenuProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  items?: ReactNode;
}

export function LinksMenu({ items, ...props }: LinksMenuProps): ReactNode {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useOnChange(pathname, () => {
    setOpen(false);
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger {...props} />
      <PopoverContent className="flex flex-col p-1">{items}</PopoverContent>
    </Popover>
  );
}

export { IconItem } from '@/layouts/links';
export { MenuItem } from '@/layouts/menu-item';
export { NavProvider } from '@/components/layout/nav';
export { RootToggle } from '@/components/layout/root-toggle';
export { Sidebar } from '@/components/layout/sidebar';
export { TreeContextProvider } from '@/contexts/tree';
export { ThemeToggle } from '@/components/layout/theme-toggle';
export {
  LanguageToggle,
  LanguageToggleText,
} from '@/components/layout/language-toggle';
