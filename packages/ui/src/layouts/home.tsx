import { replaceOrDefault } from '@/utils/shared';
import { getLinks, type BaseLayoutProps } from './shared';

declare const { Nav }: typeof import('./home.client');

export type HomeLayoutProps = BaseLayoutProps;

export function HomeLayout({
  nav = {},
  links = [],
  ...props
}: BaseLayoutProps): React.ReactElement {
  const finalLinks = getLinks(links, props.githubUrl);

  return (
    <>
      {replaceOrDefault(
        nav,
        <Nav
          items={finalLinks}
          i18n={props.i18n}
          disableThemeSwitch={props.disableThemeSwitch}
          {...nav}
        >
          <style>{`:root { --fd-nav-height 3.5rem; }`}</style>
          {nav.children}
        </Nav>,
      )}
      {props.children}
    </>
  );
}
