import type { ReactNode } from 'react';
import type { MDXComponents } from 'mdx/types';
import { DocsBody } from 'fumadocs-ui/layouts/docs/page';
import { createIsland } from '../island';
import { ContentProvider, type ProviderData } from './provider';

/** the props of content, `wrapper` of the content island receives them */
export interface ContentProps {
  provider?: ProviderData;
  /** the body of a docs page, in `wrapper`, rather than content on your own pages */
  body?: boolean;
}

/**
 * The content island of Fumadocs pages, `wrapper` defaults to `DocsBody`.
 */
export function createContentIsland(components: MDXComponents) {
  const Wrapper = components.wrapper ?? DocsBody;

  return createIsland({
    ...components,
    wrapper: ({ children, provider, body = true }: ContentProps & { children: ReactNode }) => {
      const content = body ? <Wrapper>{children}</Wrapper> : children;
      return provider ? <ContentProvider provider={provider}>{content}</ContentProvider> : content;
    },
  });
}
