'use client';
import type { ComponentProps } from 'react';
import { RootProvider as BaseProvider } from '@/provider/base';
import { AstroProvider } from 'fumadocs-core/framework/astro';
import type { AstroProviderProps } from 'fumadocs-core/framework/astro';
import type { Framework } from 'fumadocs-core/framework';

export interface RootProviderProps extends ComponentProps<typeof BaseProvider> {
  /**
   * The current Astro pathname, usually `Astro.url.pathname`.
   */
  pathname: AstroProviderProps['pathname'];

  /**
   * The current Astro route params, usually `Astro.params`.
   */
  params?: AstroProviderProps['params'];

  /**
   * Optional Astro client navigation function from `astro:transitions/client`.
   */
  navigate?: AstroProviderProps['navigate'];

  /**
   * Custom framework components to override Astro defaults
   */
  components?: {
    Link?: Framework['Link'];
    Image?: Framework['Image'];
  };
}

export function RootProvider({
  components,
  pathname,
  params,
  navigate,
  ...props
}: RootProviderProps) {
  return (
    <AstroProvider
      pathname={pathname}
      params={params}
      navigate={navigate}
      Link={components?.Link}
      Image={components?.Image}
    >
      <BaseProvider {...props}>{props.children}</BaseProvider>
    </AstroProvider>
  );
}
