'use client';

import { type ComponentProps, createContext, type ReactNode, useMemo } from 'react';
import { cn } from '@fumadocs/ui/cn';
import { SidebarViewport, useSidebar } from '@/components/sidebar/base';
import type { SidebarTab } from '@/components/sidebar/tabs';
import { SidebarTabsDropdown } from '@/components/sidebar/tabs/dropdown';
import { useIsScrollTop } from '@fumadocs/ui/hooks/use-is-scroll-top';
import { Sidebar, SidebarContent, SidebarLinkItem, SidebarPageTree } from './sidebar';
import { buttonVariants } from '@/components/ui/button';
import { Languages, SidebarIcon, XIcon } from 'lucide-react';
import { renderTitleNav, useLinkItems } from '../shared';
import { LanguageToggle } from '../shared/language-toggle';
import { SearchToggle } from '../shared/search-toggle';
import { ThemeToggle } from '../shared/theme-toggle';
import { DocsLayoutProps } from '.';
import { LinkItem } from '@fumadocs/ui/link-item';
import { AnimatePresence, motion } from 'motion/react';

export const LayoutContext = createContext<{
  isNavTransparent: boolean;
} | null>(null);

const MotionSidebarTabsDropdown = motion.create(SidebarTabsDropdown);

export function LayoutContextProvider({
  navTransparentMode = 'none',
  children,
}: {
  navTransparentMode?: 'always' | 'top' | 'none';
  children: ReactNode;
}) {
  const isTop = useIsScrollTop({ enabled: navTransparentMode === 'top' }) ?? true;
  const isNavTransparent = navTransparentMode === 'top' ? isTop : navTransparentMode === 'always';

  return (
    <LayoutContext
      value={useMemo(
        () => ({
          isNavTransparent,
        }),
        [isNavTransparent],
      )}
    >
      {children}
    </LayoutContext>
  );
}

export function LayoutBody({ className, children, ...props }: ComponentProps<'div'>) {
  const { collapsed } = useSidebar();

  return (
    <div
      id="nd-flux-layout"
      className={cn(
        'flex flex-col items-center overflow-x-clip min-h-(--fd-docs-height) [--fd-docs-height:100dvh]',
        className,
      )}
      data-sidebar-collapsed={collapsed}
      {...props}
    >
      {children}
    </div>
  );
}

export function LayoutContent({
  nav = {},
  sidebar: { enabled: sidebarEnabled = true, defaultOpenLevel, prefetch, ...sidebarProps } = {},
  searchToggle = {},
  themeSwitch = {},
  i18n = false,
  children,
  tabs,
  containerProps,
  ...props
}: Omit<DocsLayoutProps, 'tree'> & {
  tabs: SidebarTab[];
}) {
  const { menuItems } = useLinkItems(props);
  const iconLinks = menuItems.filter((item) => item.type === 'icon');

  function sidebar() {
    const { footer, banner, component, components, ...rest } = sidebarProps;
    if (component) return component;

    return (
      <SidebarContent {...rest}>
        <div className="flex flex-col gap-3 p-4 pb-2">{banner}</div>
        <SidebarViewport>
          {menuItems
            .filter((v) => v.type !== 'icon')
            .map((item, i, list) => (
              <SidebarLinkItem
                key={i}
                item={item}
                className={cn(i === list.length - 1 && 'mb-4')}
              />
            ))}
          <SidebarPageTree {...components} />
        </SidebarViewport>
        {footer}
      </SidebarContent>
    );
  }

  return (
    <Sidebar defaultOpenLevel={defaultOpenLevel} prefetch={prefetch}>
      <LayoutBody {...containerProps}>
        {sidebarEnabled && sidebar()}
        {children}
      </LayoutBody>
      <Navigation
        title={renderTitleNav(nav, {
          className: 'inline-flex items-center gap-2.5 text-sm font-semibold',
        })}
        head={
          <>
            {tabs.length > 0 && (
              <MotionSidebarTabsDropdown
                layout
                options={tabs}
                className="py-1 bg-transparent shadow-sm rounded-full"
              />
            )}
          </>
        }
        tool={
          <>
            {i18n && (
              <LanguageToggle>
                <Languages className="size-4.5" />
              </LanguageToggle>
            )}

            {searchToggle.enabled !== false &&
              (searchToggle.components?.sm ?? (
                <SearchToggle className="rounded-lg" hideIfDisabled />
              ))}

            <NavigationSidebarTrigger />
            {themeSwitch.enabled !== false &&
              (themeSwitch.component ?? (
                <ThemeToggle className="p-0 ms-1" mode={themeSwitch.mode} />
              ))}
          </>
        }
        link={iconLinks.map((item, i) => (
          <LinkItem
            key={i}
            item={item}
            className={cn(buttonVariants({ size: 'icon-sm', color: 'ghost' }))}
            aria-label={item.label}
          >
            {item.icon}
          </LinkItem>
        ))}
      />
    </Sidebar>
  );
}

function NavigationSidebarTrigger() {
  const { open, setOpen } = useSidebar();
  return (
    <button
      className={cn(
        buttonVariants({
          variant: 'ghost',
          size: 'icon-sm',
        }),
      )}
      onClick={() => setOpen((prev) => !prev)}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={open ? 'open' : 'closed'}
          transition={{ duration: 0.2 }}
          initial={{
            y: '100%',
            opacity: 0,
          }}
          animate={{
            y: 0,
            opacity: 1,
          }}
          exit={{
            y: '100%',
            opacity: 0,
          }}
        >
          {open ? <XIcon /> : <SidebarIcon />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function Navigation({
  title,
  head,
  tool,
  link,
}: {
  title: ReactNode;
  head: ReactNode;
  tool: ReactNode;
  link: ReactNode;
}) {
  return (
    <div className="sticky rounded-2xl mt-4 bottom-6 mx-auto z-40 bg-fd-popover text-fd-popover-foreground p-1 border shadow-lg w-full max-w-[380px]">
      <div className="flex flex-row items-center ps-2 gap-2 mb-2 min-h-10">
        {title}
        <div id="flux-layout-slot" className="flex-1" />
      </div>

      <div className="flex flex-row items-center gap-1.5">
        <div className="flex flex-row items-center gap-2 me-auto empty:hidden">{head}</div>

        <div className="flex flex-row items-center text-fd-muted-foreground border-x px-0.5 empty:hidden">
          {link}
        </div>

        <div className="flex flex-row items-center text-fd-muted-foreground">{tool}</div>
      </div>
    </div>
  );
}
