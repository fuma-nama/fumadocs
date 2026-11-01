import type { ComponentType, ReactNode } from 'react';
import { DocsBody } from 'fumadocs-ui/layouts/docs/page';
import { createIsland } from '../island';
import { ContentProvider, type ProviderData } from './provider';

/**
 * The content island of Fumadocs pages, `wrapper` defaults to `DocsBody`.
 */
export function createContentIsland(components: Record<string, unknown>) {
  const Wrapper = (components.wrapper ?? DocsBody) as ComponentType<{ children: ReactNode }>;

  return createIsland({
    ...components,
    wrapper: ({
      children,
      provider,
      body = true,
    }: {
      children: ReactNode;
      provider?: ProviderData;
      /** the body of a docs page, in `wrapper`, rather than content on your own pages */
      body?: boolean;
    }) => {
      const content = body ? <Wrapper>{children}</Wrapper> : children;
      return provider ? <ContentProvider provider={provider}>{content}</ContentProvider> : content;
    },
  });
}
