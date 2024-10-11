import { replaceOrDefault } from '@/layouts/shared';
import { getLinks, type BaseLayoutProps } from './shared';

declare const { Nav, NavProvider }: typeof import('./home.client');

export type HomeLayoutProps = BaseLayoutProps;

export function HomeLayout({
  nav: { transparentMode, ...nav } = {},
  links = [],
  ...props
}: BaseLayoutProps): React.ReactElement {
  const finalLinks = getLinks(links, props.githubUrl);

  return (
    <NavProvider transparentMode={transparentMode}>
      <main
        id="nd-home-layout"
        className="flex flex-1 flex-col pt-[var(--fd-nav-height)]"
        style={
          {
            '--fd-nav-height': '58px',
          } as object
        }
      >
        {replaceOrDefault(
          nav,
          <Nav
            items={finalLinks}
            i18n={props.i18n}
            disableThemeSwitch={props.disableThemeSwitch}
            {...nav}
          />,
        )}
        {props.children}
      </main>
    </NavProvider>
  );
}
