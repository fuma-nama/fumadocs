import defaultMdxComponents from 'fumadocs-ui/mdx';
import { DynamicLink } from 'fumadocs-core/dynamic-link';
import { DocsBody } from 'fumadocs-ui/layouts/docs/page';
import type { MDXComponents } from 'mdx/types';
import { ContentProvider, type ProviderProps } from '@/components/provider';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    // links with the locale, like `/[lang]/docs`
    DynamicLink,
    ...components,
  } satisfies MDXComponents;
}

// for the Fumadocs integration, `wrapper` receives the props of `<Content />`
export default getMDXComponents({
  wrapper: ({ children, ...props }: ProviderProps) => (
    <ContentProvider {...props}>
      <DocsBody>{children}</DocsBody>
    </ContentProvider>
  ),
});
