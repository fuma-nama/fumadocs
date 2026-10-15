import { type ComponentProps, createContext, lazy, use } from 'react';
import * as runtime from 'react/jsx-runtime';
import { preload } from 'react-dom';
import { remark } from 'remark';
import remarkRehype from 'remark-rehype';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { FrameworkProvider, type Router } from 'fumadocs-core/framework';
import type * as PageTree from 'fumadocs-core/page-tree';
import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import { RootProvider } from 'fumadocs-ui/provider/base';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { DocsLayout } from 'fumadocs-ui/layouts/spacious';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/spacious/page';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { createOpenAPIPage } from 'fumadocs-openapi/ui';
import type { Document } from 'fumadocs-openapi';
import type { OverviewPageData, PageData, SiteData } from './types';

const OpenAPIPage = createOpenAPIPage();
const SearchDialog = lazy(() => import('./search'));
const markdown = remark().use(remarkGfm).use(remarkRehype);
const mdxComponents = { ...defaultMdxComponents, img: 'img' };

export interface AppProps {
  site: SiteData;
  /** `site.tree` deserialized */
  tree: PageTree.Root;
  /** normalized with `normalizePathname()` */
  pathname: string;
  router: Router;
  /** the bundled documents of rendered pages */
  getDocument: (id: string) => Document;
  /** URLs to preload, for server rendering */
  preloads?: string[];
}

const RouterContext = createContext<{ pathname: string; router: Router } | null>(null);
const params = {};

function useRouterContext() {
  const ctx = use(RouterContext);
  if (!ctx) throw new Error('missing router');
  return ctx;
}

const framework = {
  usePathname: () => useRouterContext().pathname,
  useRouter: () => useRouterContext().router,
  useParams: () => params,
  Link,
};

export function normalizePathname(pathname: string): string {
  // static hosts serve directory indexes with a trailing slash
  if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
  try {
    return decodeURI(pathname);
  } catch {
    return pathname;
  }
}

export function App({ site, tree, pathname, router, getDocument, preloads = [] }: AppProps) {
  for (const href of preloads) preload(href, { as: 'fetch', crossOrigin: 'anonymous' });
  const page = site.pages[pathname] as PageData | undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`${page?.title ?? 'Not Found'} | ${site.title}`}</title>
        {page?.description && <meta name="description" content={page.description} />}
        {site.styles.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      </head>
      <body className="flex flex-col min-h-screen">
        <RouterContext value={{ pathname, router }}>
          <FrameworkProvider {...framework}>
            <RootProvider search={{ SearchDialog, options: { api: site.search } }}>
              <DocsLayout tree={tree} nav={{ title: site.title, url: site.url }}>
                <Content key={pathname} site={site} page={page} getDocument={getDocument} />
              </DocsLayout>
            </RootProvider>
          </FrameworkProvider>
        </RouterContext>
      </body>
    </html>
  );
}

function Content({
  site,
  page,
  getDocument,
}: {
  site: SiteData;
  page?: PageData;
  getDocument: AppProps['getDocument'];
}) {
  if (!page) {
    return (
      <DocsPage full>
        <DocsTitle>Not Found</DocsTitle>
        <DocsDescription>The page you are looking for doesn&apos;t exist.</DocsDescription>
      </DocsPage>
    );
  }

  if (page.type === 'overview') return <Overview page={page} />;

  const id = page.props.document;
  return (
    <DocsPage toc={page.toc} full={page.toc.length === 0}>
      <DocsTitle>{page.title}</DocsTitle>
      <DocsBody>
        <OpenAPIPage
          {...page.props}
          preloaded={{ docs: { [id]: getDocument(id) }, proxyUrl: site.proxyUrl }}
        />
      </DocsBody>
    </DocsPage>
  );
}

function Overview({ page }: { page: OverviewPageData }) {
  return (
    <DocsPage full>
      <div className="flex flex-row flex-wrap items-center gap-2">
        <DocsTitle>{page.heading}</DocsTitle>
        {page.version && (
          <span className="rounded-full border px-2 py-0.5 font-mono text-xs text-fd-muted-foreground">
            {page.version}
          </span>
        )}
      </div>
      {page.description && <DocsDescription>{page.description}</DocsDescription>}
      <DocsBody>
        {page.body &&
          toJsxRuntime(markdown.runSync(markdown.parse(page.body)), {
            ...runtime,
            components: mdxComponents,
          })}
        <Cards>
          {page.cards.map((card) => (
            <Card
              key={card.url}
              href={card.url}
              title={card.title}
              description={card.description}
            />
          ))}
        </Cards>
      </DocsBody>
    </DocsPage>
  );
}

function Link({
  href,
  prefetch: _prefetch,
  onClick,
  ...props
}: ComponentProps<'a'> & { prefetch?: boolean }) {
  const { router } = useRouterContext();

  return (
    <a
      {...props}
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (!href || e.defaultPrevented || e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if ((props.target && props.target !== '_self') || props.download !== undefined) return;

        e.preventDefault();
        void router.push(href);
      }}
    />
  );
}
