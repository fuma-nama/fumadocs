import { useMemo, type ComponentType, type CSSProperties } from 'react';
import { type SerializedPageTree, useFumadocsLoader } from 'fumadocs-core/source/client';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import {
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  PageLastUpdate,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import UserPage from 'virtual:fumadocs/page';
import type { DocsPageProps } from '../app';
import { Provider, resolveLayout, type ProviderProps } from './provider';

/** the props of the `page` module with the serialized tree, `layout` is the defaults of `baseOptions()` */
export interface DocsProps extends ProviderProps, Omit<DocsPageProps, 'tree'> {
  /** JSON of the {@link SerializedPageTree}, from `getSerializedTree()` */
  tree: string;
}

const Page: ComponentType<DocsPageProps> = UserPage ?? DefaultPage;

/**
 * The React island of docs pages, the body is passed as children.
 */
export function Docs({ provider, layout, tree, page, children }: DocsProps) {
  const serialized = useMemo<SerializedPageTree>(() => JSON.parse(tree), [tree]);
  const data = useFumadocsLoader({ tree: serialized });

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
        {(page.markdownUrl || page.githubUrl) && (
          <div style={pageActions}>
            {page.markdownUrl && <MarkdownCopyButton markdownUrl={page.markdownUrl} />}
            <ViewOptionsPopover markdownUrl={page.markdownUrl} githubUrl={page.githubUrl} />
          </div>
        )}
        {children}
        {page.lastModified && <PageLastUpdate date={page.lastModified} />}
      </DocsPage>
    </DocsLayout>
  );
}
