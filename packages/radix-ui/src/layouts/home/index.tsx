import type { ComponentProps } from 'react';
import { cn } from '@/utils/cn';
import { type BaseLayoutProps, type NavOptions } from '@/layouts/shared';
import { Header } from '@/layouts/home/client';
import { renderer, type Renderer } from '@/utils/renderer';

export interface HomeLayoutProps extends BaseLayoutProps {
  Container?: Renderer<ComponentProps<'main'>>;
  nav?: Partial<
    NavOptions & {
      /**
       * Open mobile menu when hovering the trigger
       */
      enableHoverToOpen?: boolean;
    }
  >;
}

export function HomeLayout({
  nav = {},
  links,
  githubUrl,
  i18n,
  LanguageSwitch,
  ThemeSwitch,
  SearchToggle,
  LargeSearchToggle,
  themeSwitch = {},
  searchToggle,
  Container,
  children,
  ...rest
}: HomeLayoutProps & ComponentProps<'main'>) {
  const renderMain = renderer(Container ?? rest, 'main');

  return renderMain?.((t) => ({
    id: 'nd-home-layout',
    ...t,
    ...rest,
    className: cn('flex flex-1 flex-col [--fd-layout-width:1400px]', t?.className, rest.className),
    children: (
      <>
        {nav.enabled !== false &&
          (nav.component ?? (
            <Header
              links={links}
              nav={nav}
              themeSwitch={themeSwitch}
              searchToggle={searchToggle}
              i18n={i18n}
              LanguageSwitch={LanguageSwitch}
              ThemeSwitch={ThemeSwitch}
              SearchToggle={SearchToggle}
              LargeSearchToggle={LargeSearchToggle}
              githubUrl={githubUrl}
            />
          ))}
        {children}
      </>
    ),
  }));
}
