'use client';

import type { BaseLayoutProps, NavOptions } from '@/layouts/shared';
import { type ComponentProps, createContext, type FC, use } from 'react';
import { baseSlots, useLinkItems, type BaseSlots, type BaseSlotsProps } from '@/layouts/shared';
import type { LinkItemType } from '@/layouts/shared';
import { Container } from './slots/container';
import { Header } from './slots/header';

export interface HomeLayoutProps extends BaseLayoutProps, ComponentProps<'main'> {
  nav?: Nav;
  slots?: Partial<HomeSlots>;
}

interface Nav extends NavOptions {
  /**
   * Open mobile menu when hovering the trigger
   */
  enableHoverToOpen?: boolean;
}

export interface HomeSlots extends BaseSlots {
  header: FC<ComponentProps<'header'>>;
  container: FC<ComponentProps<'main'>>;
}

const LayoutContext = createContext<{
  props: BaseSlotsProps<HomeLayoutProps>;
  navItems: LinkItemType[];
  menuItems: LinkItemType[];
  slots: HomeSlots;
} | null>(null);

export function useHomeLayout() {
  const context = use(LayoutContext);
  if (!context)
    throw new Error('Please use this component under <HomeLayout /> (`fumadocs-ui/layouts/home`).');
  return context;
}

const { useProvider } = baseSlots({
  useProps() {
    return useHomeLayout().props;
  },
});

export function HomeLayout(props: HomeLayoutProps) {
  const {
    nav: { enabled: navEnabled = true } = {},
    slots: defaultSlots,
    children,
    i18n: _i18n,
    githubUrl: _githubUrl,
    links: _links,
    themeSwitch: _themeSwitch,
    searchToggle: _searchToggle,
    ...rest
  } = props;
  const { baseSlots, baseProps } = useProvider(props);
  const linkItems = useLinkItems(props);
  const slots: HomeSlots = {
    ...baseSlots,
    header: defaultSlots?.header ?? InlineHeader,
    container: defaultSlots?.container ?? Container,
  };

  return (
    <LayoutContext
      value={{
        props: baseProps,
        slots,
        ...linkItems,
      }}
    >
      <slots.container {...rest}>
        {navEnabled && <slots.header />}
        {children}
      </slots.container>
    </LayoutContext>
  );
}

function InlineHeader(props: ComponentProps<'header'>) {
  const { nav } = useHomeLayout().props;
  if (nav?.component) return nav.component;
  return <Header {...props} />;
}
