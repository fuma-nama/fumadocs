import type { ComponentType, CSSProperties } from 'react';
import { type SerializedPageTree, useFumadocsLoader } from 'fumadocs-core/source/client';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import {
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import UserPage from 'virtual:fumadocs/page';
import type { DocsPageData, DocsPageProps } from '../app';
import { Provider, resolveLayout, type ProviderProps } from './provider';

export interface DocsProps extends ProviderProps {
  /** the defaults of layout options */
  layout: BaseLayoutProps;
  tree: SerializedPageTree;
  page: DocsPageData;
}

const Page: ComponentType<DocsPageProps> = UserPage ?? DefaultPage;

/**
 * The React island of docs pages, the body is passed as children.
 */
export function Docs({ provider, layout, tree, page, children }: DocsProps) {
  const data = useFumadocsLoader({ tree });

  return (
    <Provider provider={provider}>
      <Page tree={data.tree} page={page} layout={resolveLayout(layout, page.locale)}>
        {children}
      </Page>
    </Provider>
  );
}

// inline styles, Tailwind CSS doesn't scan this package
const pageActions: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginTop: '-1rem',
  paddingBottom: '1.5rem',
  borderBottom: '1px solid var(--color-fd-border)',
};

function DefaultPage({ tree, page, layout, children }: DocsPageProps) {
  return (
    <DocsLayout {...layout} tree={tree}>
      <DocsPage toc={page.toc} full={page.full}>
        <DocsTitle>{page.title}</DocsTitle>
        <DocsDescription>{page.description}</DocsDescription>
        {page.markdownUrl && (
          <div style={pageActions}>
            <MarkdownCopyButton markdownUrl={page.markdownUrl} />
            <ViewOptionsPopover markdownUrl={page.markdownUrl} />
          </div>
        )}
        {children}
      </DocsPage>
    </DocsLayout>
  );
}
