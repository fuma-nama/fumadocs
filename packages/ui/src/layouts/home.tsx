import type { HTMLAttributes } from 'react';
import { replaceOrDefault } from '@/layouts/shared';
import { cn } from '@/utils/cn';
import { getLinks, type BaseLayoutProps } from './shared';
import { Nav } from '@/layouts/home.client';
import { NavProvider } from '@/components/layout/nav';

export type HomeLayoutProps = BaseLayoutProps & HTMLAttributes<HTMLElement>;

export function HomeLayout({
  nav: { transparentMode, ...nav } = {},
  links = [],
  githubUrl,
  i18n,
  disableThemeSwitch,
  ...props
}: HomeLayoutProps): React.ReactElement {
  const finalLinks = getLinks(links, githubUrl);

  return (
    <NavProvider transparentMode={transparentMode}>
      <main
        id="nd-home-layout"
        {...props}
        className={cn(
          'flex flex-1 flex-col pt-[var(--fd-nav-height)]',
          props.className,
        )}
        style={
          {
            '--fd-nav-height': '54px',
            ...props.style,
          } as object
        }
      >
        {replaceOrDefault(
          nav,
          <Nav
            items={finalLinks}
            i18n={i18n}
            disableThemeSwitch={disableThemeSwitch}
            {...nav}
          />,
          {
            items: finalLinks,
            i18n,
            disableThemeSwitch,
            ...nav,
          },
        )}
        {props.children}
      </main>
    </NavProvider>
  );
}
