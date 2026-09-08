import type { I18nInfo, ReactFramework } from '@/project';
import { localeSegment } from '@/project/route';

export interface TemplateInput {
  static: boolean;
  i18n: I18nInfo | null;
  /** import specifier of `RootProvider` */
  provider: string;
  /** extra props of `RootProvider` */
  providerProps: string;
}

/** files relative to the base dir */
export type Template = (input: TemplateInput) => Record<string, string>;

const wrapper = (children: string) =>
  `<div className="flex flex-col min-h-screen">${children}</div>`;

const i18nConfig = (optionalLocale: boolean) => `import { defineI18n } from 'fumadocs-core/i18n';

export const i18n = defineI18n({
  defaultLanguage: 'en',
  languages: ['en', 'cn'],${optionalLocale ? "\n  hideLocale: 'default-locale'," : ''}
});
`;

const sharedConstants = `export const docsRoute = '/docs';
`;

const source = (async: boolean, i18n: boolean) => `import { loader } from 'fumadocs-core/source';
import { defineDocs } from 'fumadocs-mdx/macro';
import { docsRoute } from './shared';
${i18n ? "import { i18n } from '@/lib/i18n';\n" : ''}
export const docs = defineDocs({
  dir: 'content/docs',${async ? '\n  docs: {\n    async: true,\n  },' : ''}
});

export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),${i18n ? '\n  i18n,' : ''}
});
`;

const layoutShared = (i18n: boolean) =>
  i18n
    ? `import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { uiTranslations } from 'fumadocs-ui/i18n';
import { i18n } from '@/lib/i18n';

export const translations = i18n.translations().extend(uiTranslations());

export function baseOptions(locale: string = i18n.defaultLanguage): BaseLayoutProps {
  return {
    nav: {
      title: 'My App',
      url: \`/\${locale}\`,
    },
  };
}
`
    : `import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

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

const search = (i18n: boolean) => `'use client';
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
${i18n ? "import { useI18n } from 'fumadocs-ui/contexts/i18n';\n" : ''}
export default function DefaultSearchDialog(props: SharedProps) {
${i18n ? '  const { locale } = useI18n();\n' : ''}  const { search, setSearch, query } = useDocsSearch({
    client: staticClient(${i18n ? '{ locale }' : ''}),
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
  const i18n = input.i18n !== null;
  return {
    'lib/shared.ts': sharedConstants,
    'lib/source.ts': source(async, i18n),
    'lib/layout.shared.tsx': layoutShared(i18n),
    'components/mdx.tsx': mdx,
    ...(input.static ? { 'components/search.tsx': search(i18n) } : {}),
    ...(input.i18n ? { 'lib/i18n.ts': i18nConfig(input.i18n.optionalLocale) } : {}),
  };
}

const searchImport = (input: TemplateInput) =>
  input.static ? `import SearchDialog from '@/components/search';\n` : '';

/** imports of the root provider, with the i18n provider */
const providerImports = (input: TemplateInput) =>
  `import { RootProvider } from '${input.provider}';
${searchImport(input)}${
    input.i18n
      ? `import { i18nProvider } from 'fumadocs-ui/i18n';
import { translations } from '@/lib/layout.shared';
import { i18n } from '@/lib/i18n';
`
      : ''
  }`;

const providerProps = (input: TemplateInput) =>
  `${input.i18n ? ' i18n={i18nProvider(translations, lang)}' : ''}${input.providerProps}`;

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

const searchRoute = {
  next: (input: TemplateInput) => `import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';
${input.static ? '\nexport const revalidate = false;\n' : ''}
export const { ${input.static ? 'staticGET: GET' : 'GET'} } = createFromSource(source);
`,
  waku: `import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '@/lib/source';

export const { GET } = createFromSource(source);
`,
};

export const templates: Record<ReactFramework, Template> = {
  next: (input) => {
    const i18n = input.i18n !== null;
    // route group with `[lang]` segment for i18n
    const dir = i18n ? 'app/(docs)/[lang]' : 'app/(docs)';
    const route = i18n ? '/[lang]' : '';
    const lang = i18n ? ', params.lang' : '';

    return {
      ...shared(input, false),
      [`${dir}/layout.tsx`]: input.static
        ? `'use client';
${providerImports(input)}import { type ReactNode${i18n ? ', use' : ''} } from 'react';

export default function Layout({ ${i18n ? 'params, ' : ''}children }: LayoutProps<'${route || '/'}'>) {
${i18n ? '  const { lang } = use(params);\n\n' : ''}  return (
    <RootProvider${providerProps(input)}>
      ${wrapper('{children}')}
    </RootProvider>
  );
}
`
        : `${providerImports(input)}
export default ${i18n ? 'async ' : ''}function Layout({ ${i18n ? 'params, ' : ''}children }: LayoutProps<'${route || '/'}'>) {
${i18n ? '  const { lang } = await params;\n\n' : ''}  return (
    <RootProvider${providerProps(input)}>
      ${wrapper('{children}')}
    </RootProvider>
  );
}
`,
      [`${dir}/docs/layout.tsx`]: `import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';

export default ${i18n ? 'async ' : ''}function Layout({ ${i18n ? 'params, ' : ''}children }: LayoutProps<'${route}/docs'>) {
${i18n ? '  const { lang } = await params;\n\n' : ''}  return (
    <DocsLayout tree={source.getPageTree(${i18n ? 'lang' : ''})} {...baseOptions(${i18n ? 'lang' : ''})}>
      {children}
    </DocsLayout>
  );
}
`,
      [`${dir}/docs/[[...slug]]/page.tsx`]: `import { source } from '@/lib/source';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';

export default async function Page(props: PageProps<'${route}/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug${lang});
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

export async function generateMetadata(props: PageProps<'${route}/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug${lang});
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
`,
      'app/api/search/route.ts': searchRoute.next(input),
    };
  },

  'react-router': (input) => {
    const i18n = input.i18n !== null;
    return {
      ...shared(input, true),
      'routes/docs/layout.tsx': `import { Outlet${i18n ? ', useParams' : ''} } from 'react-router';
${providerImports(input)}
export default function Layout() {
${i18n ? '  const { lang = i18n.defaultLanguage } = useParams();\n\n' : ''}  return (
    <RootProvider${providerProps(input)}>
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
  const page = source.getPage(slugs${i18n ? ', params.lang' : ''});
  if (!page) throw new Response('Not found', { status: 404 });

  return {
    path: page.path,
    url: page.url,
    pageTree: await source.serializePageTree(source.getPageTree(${i18n ? 'params.lang' : ''})),
  };
}

${clientContent.replace('<DocsPage toc={toc}>', '<DocsPage toc={toc}>\n      <title>{page.title}</title>\n      <meta name="description" content={page.description} />')}

export default function Page({ loaderData${i18n ? ', params' : ''} }: Route.ComponentProps) {
  const { path, pageTree } = useFumadocsLoader(loaderData);

  return (
    <DocsLayout {...baseOptions(${i18n ? 'params.lang' : ''})} tree={pageTree}>
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
    };
  },

  'tanstack-start': (input) => {
    const seg = localeSegment('tanstack-start', input.i18n);
    const i18n = input.i18n !== null;
    return {
      ...shared(input, true),
      'routes/_docs.tsx': `import { createFileRoute, Outlet${i18n ? ', useParams' : ''} } from '@tanstack/react-router';
${providerImports(input)}
export const Route = createFileRoute('/_docs')({
  component: Layout,
});

function Layout() {
${i18n ? '  const { lang = i18n.defaultLanguage } = useParams({ strict: false });\n\n' : ''}  return (
    <RootProvider${providerProps(input)}>
      ${wrapper('\n        <Outlet />\n      ')}
    </RootProvider>
  );
}
`,
      [`routes/_docs/${seg}docs/$.tsx`]: `import { createFileRoute, notFound } from '@tanstack/react-router';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { createServerFn } from '@tanstack/react-start';
import { docs, source } from '@/lib/source';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { baseOptions } from '@/lib/layout.shared';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { Suspense, use } from 'react';
import { useMDXComponents } from '@/components/mdx';

export const Route = createFileRoute('/_docs/${seg}docs/$')({
  component: Page,
  loader: async ({ params }) => {
    const data = await serverLoader({
      data: {
        slugs: params._splat?.split('/') ?? [],${i18n ? '\n        lang: params.lang,' : ''}
      },
    });
    await docs.getPage(data.path)?.preload();
    return data;
  },
});

const serverLoader = createServerFn({
  method: 'GET',
})
  .validator((params: { slugs: string[]${i18n ? '; lang?: string' : ''} }) => params)
  .handler(async ({ data: { slugs${i18n ? ', lang' : ''} } }) => {
    const page = source.getPage(slugs${i18n ? ', lang' : ''});
    if (!page) throw notFound();

    return {
      path: page.path,
      pageTree: await source.serializePageTree(source.getPageTree(${i18n ? 'lang' : ''})),
    };
  });

${clientContent}

function Page() {
${i18n ? '  const { lang } = Route.useParams();\n' : ''}  const data = useFumadocsLoader(Route.useLoaderData());

  return (
    <DocsLayout {...baseOptions(${i18n ? 'lang' : ''})} tree={data.pageTree}>
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
    };
  },

  waku: (input) => {
    const i18n = input.i18n !== null;
    const page = `import { source } from '@/lib/source';
import type { PageProps } from 'waku/router';
import { unstable_notFound } from 'waku/router/server';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { getMDXComponents } from '@/components/mdx';
${i18n ? "import { DocsLayout } from 'fumadocs-ui/layouts/docs';\nimport { baseOptions } from '@/lib/layout.shared';\n" : ''}
export default function Page({ slug${i18n ? ', lang' : ''} }: PageProps<'${i18n ? '/[lang]' : ''}/docs/[...slug]'>) {
  const page = source.getPage(slug${i18n ? ', lang' : ''});
  if (!page) unstable_notFound();

  const MDX = page.data.body;
  const content = (
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
${
  i18n
    ? `
  // layouts don't receive the locale, render the docs layout here
  return (
    <DocsLayout {...baseOptions(lang)} tree={source.getPageTree(lang)}>
      {content}
    </DocsLayout>
  );`
    : `
  return content;`
}
}

export async function getConfig() {
  return {
    render: 'static',
    staticPaths: source.generateParams().map((item) => ${i18n ? '[item.lang, ...item.slug]' : 'item.slug'}),
  } as const;
}
`;

    return {
      ...shared(input, false),
      'pages/(docs)/_layout.tsx': i18n
        ? `import type { ReactNode } from 'react';
import { Provider } from '@/components/provider';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Provider>
      ${wrapper('{children}')}
    </Provider>
  );
}
`
        : `import type { ReactNode } from 'react';
${providerImports(input)}
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <RootProvider${providerProps(input)}>
      ${wrapper('{children}')}
    </RootProvider>
  );
}
`,
      ...(i18n
        ? {
            'components/provider.tsx': `'use client';
import type { ReactNode } from 'react';
import { useRouter } from 'waku/router/client';
${providerImports(input)}
export function Provider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const lang = router.path.split('/')[1] || i18n.defaultLanguage;

  return <RootProvider${providerProps(input)}>{children}</RootProvider>;
}
`,
            'pages/(docs)/[lang]/docs/[...slug].tsx': page,
          }
        : {
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
            'pages/(docs)/docs/[...slug].tsx': page,
          }),
      'pages/_api/api/search.ts': searchRoute.waku,
    };
  },
};

export const nextProxy = `import { createI18nMiddleware } from 'fumadocs-core/i18n/middleware';
import { i18n } from '@/lib/i18n';

export default createI18nMiddleware(i18n);

export const config = {
  // only the docs routes, add the ones of other features here
  matcher: ['/docs/:path*', '/:lang/docs/:path*'],
};
`;

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

export const sampleContentCn = `---
title: 你好，世界
description: 你的第一份文檔
---

歡迎來到文檔！你可以在 \`content/docs/index.cn.mdx\` 編輯這個頁面。
`;
