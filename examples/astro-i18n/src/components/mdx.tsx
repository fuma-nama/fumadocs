import defaultMdxComponents from 'fumadocs-ui/mdx';
import { DynamicLink } from 'fumadocs-core/dynamic-link';
import { DocsBody } from 'fumadocs-ui/layouts/docs/page';
import { ContentProvider, type ProviderProps } from '@/components/provider';

// MDX components of docs, they are rendered and hydrated by the Fumadocs integration
export default {
  ...defaultMdxComponents,
  // links with the locale, like `/[lang]/docs`
  DynamicLink,
  // receives the props of `<Content />`
  wrapper: ({ children, ...props }: ProviderProps) => (
    <ContentProvider {...props}>
      <DocsBody>{children}</DocsBody>
    </ContentProvider>
  ),
};
