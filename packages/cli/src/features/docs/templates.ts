import type { Framework } from '@/project';

export interface TemplateInput {
  static: boolean;
  /** import specifier of `RootProvider` */
  provider: string;
  /** extra props of `RootProvider` */
  providerProps: string;
}

/** files relative to the base dir */
export type Template = (input: TemplateInput) => Record<string, string>;

const wrapper = (children: string) =>
  `<div className="flex flex-col min-h-screen">${children}</div>`;

const source = (async: boolean) => `import { loader } from 'fumadocs-core/source';
import { defineDocs } from 'fumadocs-mdx/macro';

export const docs = defineDocs({
  dir: 'content/docs',${async ? '\n  docs: {\n    async: true,\n  },' : ''}
});

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});
`;

const layoutShared = `import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'My App',
    },
  };
}
`;

const mdx = `import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
`;

const search = `'use client';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { staticClient } from 'fumadocs-core/search/client/orama-static';

export default function DefaultSearchDialog(props: SharedProps) {
  const { search, setSearch, query } = useDocsSearch({
    client: staticClient(),
  });

  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== 'empty' ? query.data : null} />
      </SearchDialogContent>
    </SearchDialog>
  );
}
`;

function shared(input: TemplateInput, async: boolean): Record<string, string> {
  return {
    'lib/source.ts': source(async),
    'lib/layout.shared.tsx': layoutShared,
    'components/mdx.tsx': mdx,
    ...(input.static ? { 'components/search.tsx': search } : {}),
  };
}

const searchImport = (input: TemplateInput) =>
  input.static ? `import SearchDialog from '@/components/search';\n` : '';

/** the docs page for React Router & TanStack Start, where MDX content is loaded lazily on client */
const clientContent = `function Content({ path }: { path: string }) {
  const page = docs.getPage(path);
  if (!page) throw new Error(\`unknown page: \${path}\`);

  const { toc } = use(page.load());
  const MDX = page.body;

  return (
    <DocsPage toc={toc}>
      <DocsTitle>{page.title}</DocsTitle>
      <DocsDescription>{page.description}</DocsDescription>
      <DocsBody>
        <MDX components={useMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}`;

export const templates: Record<Framework, Template> = {
  next: (input) => ({
    ...shared(input, false),
    'app/(docs)/layout.tsx': `${input.static ? "'use client';\n" : ''}import { RootProvider } from '${input.provider}';
${searchImport(input)}import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <RootProvider${input.providerProps}>
      ${wrapper('{children}')}
    </RootProvider>
  );
}
`,
    'app/(docs)/docs/layout.tsx': `import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
`,
    'app/(docs)/docs/[[...slug]]/page.tsx': `import { source } from '@/lib/source';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
`,
    'app/(docs)/api/search/route.ts': `import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';
${input.static ? '\nexport const revalidate = false;\n' : ''}
export const { ${input.static ? 'staticGET: GET' : 'GET'} } = createFromSource(source);
`,
  }),

  'react-router': (input) => ({
    ...shared(input, true),
    'routes/docs/layout.tsx': `import { Outlet } from 'react-router';
import { RootProvider } from '${input.provider}';
${searchImport(input)}
export default function Layout() {
  return (
    <RootProvider${input.providerProps}>
      ${wrapper('\n        <Outlet />\n      ')}
    </RootProvider>
  );
}
`,
    'routes/docs/page.tsx': `import type { Route } from './+types/page';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { docs, source } from '@/lib/source';
import { baseOptions } from '@/lib/layout.shared';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { useMDXComponents } from '@/components/mdx';
import { use } from 'react';

export async function loader({ params }: Route.LoaderArgs) {
  const slugs = params['*'].split('/').filter((v) => v.length > 0);
  const page = source.getPage(slugs);
  if (!page) throw new Response('Not found', { status: 404 });

  return {
    path: page.path,
    url: page.url,
    pageTree: await source.serializePageTree(source.getPageTree()),
  };
}

${clientContent.replace('<DocsPage toc={toc}>', '<DocsPage toc={toc}>\n      <title>{page.title}</title>\n      <meta name="description" content={page.description} />')}

export default function Page({ loaderData }: Route.ComponentProps) {
  const { path, pageTree } = useFumadocsLoader(loaderData);

  return (
    <DocsLayout {...baseOptions()} tree={pageTree}>
      <Content path={path} />
    </DocsLayout>
  );
}
`,
    'routes/docs/search.ts': `import type { Route } from './+types/search';
import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '@/lib/source';

const server = createFromSource(source);

export async function loader(${input.static ? '' : '{ request }: Route.LoaderArgs'}) {
  return server.${input.static ? 'staticGET()' : 'GET(request)'};
}
`,
  }),

  'tanstack-start': (input) => ({
    ...shared(input, true),
    'routes/_docs.tsx': `import { createFileRoute, Outlet } from '@tanstack/react-router';
import { RootProvider } from '${input.provider}';
${searchImport(input)}
export const Route = createFileRoute('/_docs')({
  component: Layout,
});

function Layout() {
  return (
    <RootProvider${input.providerProps}>
      ${wrapper('\n        <Outlet />\n      ')}
    </RootProvider>
  );
}
`,
    'routes/_docs/docs/$.tsx': `import { createFileRoute, notFound } from '@tanstack/react-router';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { createServerFn } from '@tanstack/react-start';
import { docs, source } from '@/lib/source';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { baseOptions } from '@/lib/layout.shared';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { Suspense, use } from 'react';
import { useMDXComponents } from '@/components/mdx';

export const Route = createFileRoute('/_docs/docs/$')({
  component: Page,
  loader: async ({ params }) => {
    const slugs = params._splat?.split('/') ?? [];
    const data = await serverLoader({ data: slugs });
    await docs.getPage(data.path)?.preload();
    return data;
  },
});

const serverLoader = createServerFn({
  method: 'GET',
})
  .validator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const page = source.getPage(slugs);
    if (!page) throw notFound();

    return {
      path: page.path,
      pageTree: await source.serializePageTree(source.getPageTree()),
    };
  });

${clientContent}

function Page() {
  const data = useFumadocsLoader(Route.useLoaderData());

  return (
    <DocsLayout {...baseOptions()} tree={data.pageTree}>
      <Suspense>
        <Content path={data.path} />
      </Suspense>
    </DocsLayout>
  );
}
`,
    'routes/api/search.ts': `import { createFileRoute } from '@tanstack/react-router';
import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

const server = createFromSource(source);

export const Route = createFileRoute('/api/search')({
  server: {
    handlers: {
      GET: ${input.static ? '() => server.staticGET()' : 'async ({ request }) => server.GET(request)'},
    },
  },
});
`,
  }),

  waku: (input) => ({
    ...shared(input, false),
    'pages/(docs)/_layout.tsx': `import type { ReactNode } from 'react';
import { RootProvider } from '${input.provider}';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <RootProvider${input.providerProps}>
      ${wrapper('{children}')}
    </RootProvider>
  );
}
`,
    'pages/(docs)/docs/_layout.tsx': `import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout {...baseOptions()} tree={source.getPageTree()}>
      {children}
    </DocsLayout>
  );
}
`,
    'pages/(docs)/docs/[...slugs].tsx': `import { source } from '@/lib/source';
import type { PageProps } from 'waku/router';
import { unstable_notFound } from 'waku/router/server';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { getMDXComponents } from '@/components/mdx';

export default function Page({ slugs }: PageProps<'/docs/[...slugs]'>) {
  const page = source.getPage(slugs);
  if (!page) unstable_notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function getConfig() {
  return {
    render: 'static',
    staticPaths: source.generateParams().map((item) => item.slug),
  } as const;
}
`,
    'pages/_api/api/search.ts': `import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '@/lib/source';

export const { GET } = createFromSource(source);
`,
  }),
};

export const sampleContent = `---
title: Hello World
description: Your first document
---

Welcome to the docs! You can edit this page in \`content/docs/index.mdx\`.

## Heading

<Cards>
  <Card title="Learn more about Fumadocs" href="https://fumadocs.dev" />
</Cards>
`;
