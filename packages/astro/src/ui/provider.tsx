import { navigate } from 'astro:transitions/client';
import { lazy, type ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/astro';
import type { I18nProviderProps } from 'fumadocs-ui/contexts/i18n';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { baseOptions, SearchDialog, useSearch } from 'virtual:fumadocs/layout';

const Dialog = SearchDialog ?? lazy(() => import('./search'));

/** the serializable props of providers, created by the Astro components of Fumadocs */
export interface ProviderData {
  /** `Astro.url.pathname` */
  pathname: string;
  /** `Astro.params` */
  params: Record<string, string | undefined>;
  i18n?: I18nProviderProps;
  /** has the built-in search index */
  search: boolean;
}

export interface ProviderProps {
  provider: ProviderData;
  children?: ReactNode;
}

export function Provider({
  provider: { pathname, params, i18n, search },
  children,
}: ProviderProps) {
  return (
    <RootProvider
      pathname={pathname}
      params={params}
      navigate={navigate}
      i18n={i18n}
      search={search || SearchDialog || useSearch ? { SearchDialog: Dialog } : { enabled: false }}
    >
      {children}
    </RootProvider>
  );
}

/**
 * For islands of the content, they are React trees of their own: without the theme and search of the layout.
 */
export function ContentProvider({ provider: { pathname, params, i18n }, children }: ProviderProps) {
  return (
    <RootProvider
      pathname={pathname}
      params={params}
      navigate={navigate}
      i18n={i18n}
      theme={{ enabled: false }}
      search={{ enabled: false }}
    >
      {children}
    </RootProvider>
  );
}

/** `baseOptions()` of the `layout` module over the defaults from the server */
export function resolveLayout(defaults: BaseLayoutProps, locale?: string): BaseLayoutProps {
  const options = baseOptions?.(locale);
  if (!options) return defaults;
  return { ...defaults, ...options, nav: { ...defaults.nav, ...options.nav } };
}
