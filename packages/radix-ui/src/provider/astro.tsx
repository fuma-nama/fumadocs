'use client';
import { type ComponentProps, useEffect, useEffectEvent } from 'react';
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
  // the client router of Astro replaces the attributes of `<html>`, keep the theme of `next-themes`
  const onBeforeSwap = useEffectEvent((next: HTMLElement) => {
    const { enabled, attribute = 'class' } = props.theme ?? {};
    if (enabled === false) return;

    const current = document.documentElement;
    for (const name of Array.isArray(attribute) ? attribute : [attribute]) {
      const value = current.getAttribute(name);
      if (value !== null) next.setAttribute(name, value);
    }
    next.style.colorScheme = current.style.colorScheme;
  });

  useEffect(() => {
    const listener = (event: Event) =>
      onBeforeSwap((event as Event & { newDocument: Document }).newDocument.documentElement);
    document.addEventListener('astro:before-swap', listener);
    return () => document.removeEventListener('astro:before-swap', listener);
  }, []);

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
