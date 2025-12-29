'use client';
import {
  type ComponentProps,
  createContext,
  Fragment,
  use,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from 'react';
import { cva } from 'class-variance-authority';
import Link from 'fumadocs-core/link';
import { cn } from '@fumadocs/ui/cn';
import {
  type LinkItemType,
  type NavOptions,
  renderTitleNav,
  resolveLinkItems,
} from '@/layouts/shared';
import { LinkItem } from '@fumadocs/ui/link-item';
import {
  NavigationMenuRoot,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { buttonVariants } from '@/components/ui/button';
import type { HomeLayoutProps } from '.';
import {
  LargeSearchToggle,
  SearchToggle,
} from '@/layouts/shared/search-toggle';
import { ThemeToggle } from '@/layouts/shared/theme-toggle';
import {
  LanguageToggle,
  LanguageToggleText,
} from '@/layouts/shared/language-toggle';
import { ChevronDown, Languages } from 'lucide-react';
import { useIsScrollTop } from '@fumadocs/ui/hooks/use-is-scroll-top';
import { NavigationMenu } from '@base-ui/react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const MobileMenuContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

export const navItemVariants = cva('[&_svg]:size-4', {
  variants: {
    variant: {
      main: 'inline-flex items-center gap-1 p-2 text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground data-[active=true]:text-fd-primary data-[popup-open]:text-fd-primary',
      button: buttonVariants({
        color: 'secondary',
        className: 'gap-1.5',
      }),
      icon: buttonVariants({
        color: 'ghost',
        size: 'icon',
      }),
    },
  },
  defaultVariants: {
    variant: 'main',
  },
});

export function Header({
  nav = {},
  i18n = false,
  links,
  githubUrl,
  themeSwitch = {},
  searchToggle = {},
}: HomeLayoutProps) {
  const { navItems, menuItems } = useMemo(() => {
    const navItems: LinkItemType[] = [];
    const menuItems: LinkItemType[] = [];

    for (const item of resolveLinkItems({ links, githubUrl })) {
      switch (item.on ?? 'all') {
        case 'menu':
          menuItems.push(item);
          break;
        case 'nav':
          navItems.push(item);
          break;
        default:
          navItems.push(item);
          menuItems.push(item);
      }
    }

    return { navItems, menuItems };
  }, [links, githubUrl]);

  return (
    <MobileMenuCollapsible
      render={(_, s) => (
        <HeaderRoot
          transparentMode={nav.transparentMode}
          className={cn(s.open && 'shadow-lg rounded-b-2xl')}
        >
          <NavigationMenuList className="flex h-14 w-full items-center px-4">
            {renderTitleNav(nav, {
              className: 'inline-flex items-center gap-2.5 font-semibold',
            })}
            {nav.children}
            <ul className="flex flex-row items-center gap-2 px-6 max-sm:hidden">
              {navItems
                .filter((item) => !isSecondary(item))
                .map((item, i) => (
                  <NavigationMenuLinkItem
                    key={i}
                    item={item}
                    className="text-sm"
                  />
                ))}
            </ul>
            <div className="flex flex-row items-center justify-end gap-1.5 flex-1 max-lg:hidden">
              {searchToggle.enabled !== false &&
                (searchToggle.components?.lg ?? (
                  <LargeSearchToggle
                    className="w-full rounded-full ps-2.5 max-w-[240px]"
                    hideIfDisabled
                  />
                ))}
              {themeSwitch.enabled !== false &&
                (themeSwitch.component ?? (
                  <ThemeToggle mode={themeSwitch?.mode} />
                ))}
              {i18n && (
                <LanguageToggle>
                  <Languages className="size-5" />
                </LanguageToggle>
              )}
              <ul className="flex flex-row gap-2 items-center empty:hidden">
                {navItems.filter(isSecondary).map((item, i) => (
                  <NavigationMenuLinkItem
                    key={i}
                    className={cn(
                      item.type === 'icon' && '-mx-1 first:ms-0 last:me-0',
                    )}
                    item={item}
                  />
                ))}
              </ul>
            </div>
            <ul className="flex flex-row items-center ms-auto -me-1.5 lg:hidden">
              {searchToggle.enabled !== false &&
                (searchToggle.components?.sm ?? (
                  <SearchToggle className="p-2" hideIfDisabled />
                ))}
              <CollapsibleTrigger
                aria-label="Toggle Menu"
                className={cn(
                  buttonVariants({
                    size: 'icon',
                    color: 'ghost',
                    className: 'group [&_svg]:size-5.5',
                  }),
                )}
              >
                <ChevronDown className="transition-transform duration-300 group-data-[panel-open]:rotate-180" />
              </CollapsibleTrigger>
            </ul>
          </NavigationMenuList>
          <CollapsibleContent className="flex flex-col px-4">
            {menuItems
              .filter((item) => !isSecondary(item))
              .map((item, i) => (
                <MobileMenuLinkItem
                  key={i}
                  item={item}
                  className="first:mt-4 sm:hidden"
                />
              ))}
            <div className="-ms-1.5 flex flex-row pt-2 pb-4 items-center justify-end gap-2">
              {menuItems.filter(isSecondary).map((item, i) => (
                <MobileMenuLinkItem
                  key={i}
                  item={item}
                  className={cn(item.type === 'icon' && '-mx-1 first:ms-0')}
                />
              ))}
              <div role="separator" className="flex-1 sm:hidden" />
              {i18n && (
                <LanguageToggle>
                  <Languages className="size-5" />
                  <LanguageToggleText />
                  <ChevronDown className="size-3 text-fd-muted-foreground" />
                </LanguageToggle>
              )}
              {themeSwitch.enabled !== false &&
                (themeSwitch.component ?? (
                  <ThemeToggle mode={themeSwitch?.mode} />
                ))}
            </div>
          </CollapsibleContent>
          <NavigationMenu.Portal>
            <NavigationMenu.Positioner
              sideOffset={10}
              className="z-20 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[left,right] duration-(--duration) ease-(--easing) data-[instant]:transition-none"
              style={{
                ['--duration' as string]: '0.35s',
                ['--easing' as string]: 'cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <NavigationMenu.Popup className="relative w-(--popup-width) h-(--popup-height) max-w-(--fd-layout-width,1400px) origin-(--transform-origin) rounded-xl bg-fd-background/80  border backdrop-blur-lg shadow-lg transition-[opacity,transform,width,height,scale,translate] duration-(--duration) ease-(--easing) data-[ending-style]:scale-90 data-[ending-style]:opacity-0 data-[ending-style]:duration-150 data-[starting-style]:scale-90 data-[starting-style]:opacity-0">
                <NavigationMenu.Viewport className="relative size-full overflow-hidden" />
              </NavigationMenu.Popup>
            </NavigationMenu.Positioner>
          </NavigationMenu.Portal>
        </HeaderRoot>
      )}
    />
  );
}

function MobileMenuCollapsible(props: ComponentProps<typeof Collapsible>) {
  const [open, setOpen] = useState(false);

  const onClick = useEffectEvent((e: Event) => {
    if (!open) return;
    const header = document.getElementById('nd-nav');
    if (header && !header.contains(e.target as HTMLElement)) setOpen(false);
  });

  useEffect(() => {
    window.addEventListener('click', onClick);

    return () => {
      window.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <MobileMenuContext
      value={useMemo(
        () => ({
          open,
          setOpen,
        }),
        [open],
      )}
    >
      <Collapsible open={open} onOpenChange={setOpen} {...props} />
    </MobileMenuContext>
  );
}

function isSecondary(item: LinkItemType): boolean {
  if ('secondary' in item && item.secondary != null) return item.secondary;

  return item.type === 'icon';
}

function HeaderRoot({
  transparentMode = 'none',
  children,
  className,
  ...props
}: ComponentProps<'div'> & {
  transparentMode?: NavOptions['transparentMode'];
}) {
  const isTop = useIsScrollTop({ enabled: transparentMode === 'top' }) ?? true;
  const isTransparent =
    transparentMode === 'top' ? isTop : transparentMode === 'always';

  return (
    <header id="nd-nav" className="sticky h-14 top-0 z-40">
      <NavigationMenuRoot
        render={(_, s) => (
          <nav
            className={cn(
              'w-full backdrop-blur-lg border-b transition-colors mx-auto max-w-(--fd-layout-width)',
              (!isTransparent || s.open) && 'bg-fd-background/80',
              className,
            )}
            {...props}
          >
            {children}
          </nav>
        )}
      />
    </header>
  );
}

function NavigationMenuLinkItem({
  item,
  ...props
}: {
  item: LinkItemType;
  className?: string;
}) {
  if (item.type === 'custom') return <div {...props}>{item.children}</div>;

  if (item.type === 'menu') {
    const children = item.items.map((child, j) => {
      if (child.type === 'custom') {
        return <Fragment key={j}>{child.children}</Fragment>;
      }

      const {
        banner = child.icon ? (
          <div className="w-fit rounded-md border bg-fd-muted p-1 [&_svg]:size-4">
            {child.icon}
          </div>
        ) : null,
        ...rest
      } = child.menu ?? {};

      return (
        <NavigationMenuLink
          key={`${j}-${child.url}`}
          render={
            <Link
              href={child.url}
              external={child.external}
              {...rest}
              className={cn(
                'flex flex-col gap-2 rounded-lg border bg-fd-card p-3 transition-colors hover:bg-fd-accent/80 hover:text-fd-accent-foreground',
                rest.className,
              )}
            >
              {rest.children ?? (
                <>
                  {banner}
                  <p className="text-base font-medium">{child.text}</p>
                  <p className="text-sm text-fd-muted-foreground empty:hidden">
                    {child.description}
                  </p>
                </>
              )}
            </Link>
          }
        />
      );
    });

    return (
      <NavigationMenuItem {...props}>
        <NavigationMenuTrigger className={cn(navItemVariants(), 'rounded-md')}>
          {item.url ? (
            <Link href={item.url} external={item.external}>
              {item.text}
            </Link>
          ) : (
            item.text
          )}
        </NavigationMenuTrigger>
        <NavigationMenuContent className="grid grid-cols-1 gap-2 p-4 md:grid-cols-2 lg:grid-cols-3">
          {children}
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem {...props}>
      <NavigationMenuLink
        render={
          <LinkItem
            item={item}
            aria-label={item.type === 'icon' ? item.label : undefined}
            className={cn(navItemVariants({ variant: item.type }))}
          >
            {item.type === 'icon' ? item.icon : item.text}
          </LinkItem>
        }
      />
    </NavigationMenuItem>
  );
}

function MobileMenuLinkItem({
  item,
  className,
}: {
  item: LinkItemType;
  className?: string;
}) {
  if (item.type === 'custom')
    return <div className={cn('grid', className)}>{item.children}</div>;
  const { setOpen } = use(MobileMenuContext)!;

  if (item.type === 'menu') {
    const header = (
      <>
        {item.icon}
        {item.text}
      </>
    );

    return (
      <div className={cn('mb-4 flex flex-col', className)}>
        <p className="mb-1 text-sm text-fd-muted-foreground">
          {item.url ? (
            <Link
              href={item.url}
              external={item.external}
              onClick={() => setOpen(false)}
            >
              {header}
            </Link>
          ) : (
            header
          )}
        </p>
        {item.items.map((child, i) => (
          <MobileMenuLinkItem key={i} item={child} />
        ))}
      </div>
    );
  }

  return (
    <LinkItem
      item={item}
      className={cn(
        (!item.type || item.type === 'main') &&
          'inline-flex items-center gap-2 py-1.5 transition-colors hover:text-fd-popover-foreground/50 data-[active=true]:font-medium data-[active=true]:text-fd-primary [&_svg]:size-4',
        item.type === 'icon' &&
          buttonVariants({
            size: 'icon',
            color: 'ghost',
          }),
        item.type === 'button' &&
          buttonVariants({
            color: 'secondary',
            className: 'gap-1.5 [&_svg]:size-4',
          }),
        className,
      )}
      aria-label={item.type === 'icon' ? item.label : undefined}
      onClick={() => setOpen(false)}
    >
      {item.icon}
      {item.type !== 'icon' && item.text}
    </LinkItem>
  );
}
