import type { TOCItemType } from 'fumadocs-core/toc';
import type { Layer } from '../../ui/spec';

/** headings of the sample page */
export const toc: TOCItemType[] = [
  { title: 'Installation', url: '#installation', depth: 2 },
  { title: 'Usage', url: '#usage', depth: 2 },
  { title: 'Configuration', url: '#configuration', depth: 3 },
  { title: 'Deployment', url: '#deployment', depth: 2 },
];

/** the npm code block of the page, as `remarkNpm` converts it */
export const install = [
  { value: 'npm', code: 'npm create fumadocs-app' },
  { value: 'pnpm', code: 'pnpm create fumadocs-app' },
  { value: 'yarn', code: 'yarn create fumadocs-app' },
  { value: 'bun', code: 'bunx create-fumadocs-app' },
];

/** the status line of each chapter; the first is also the figure's own */
export const STATUS = ['8 parts, 8 APIs', 'layers: ui, core, content', 'swap any layer'];

export interface PartInfo {
  name: string;
  /** the API that renders or produces the part */
  api: string;
}

export const parts: PartInfo[] = [
  { name: 'navbar', api: '<DocsLayout nav>' },
  { name: 'search', api: '<SearchDialog>' },
  { name: 'sidebar', api: '<DocsLayout sidebar>' },
  { name: 'page tree', api: 'source.getPageTree()' },
  { name: 'title', api: '<DocsTitle>' },
  { name: 'callout', api: '<Callout>' },
  { name: 'code block', api: '<CodeBlockTabs>' },
  { name: 'table of contents', api: '<DocsPage toc>' },
];

export interface Option {
  /** the module */
  name: string;
  /** its name in prose, as the docs spell it: the label of its key */
  title: string;
  /** title of the code window */
  file: string;
  lang: string;
  code: string;
  /** a command that produced the file */
  command?: string;
}

export interface Slot {
  layer: Layer;
  /** `false` for the core, every other layer plugs into it */
  swappable: boolean;
  options: Option[];
}

// from content/docs/mdx/(integrations)/next.mdx, headless/content-collections,
// integrations/content/{local-md,notion,obsidian,sanity}.mdx
const content: Option[] = [
  {
    name: 'fumadocs-mdx',
    title: 'Fumadocs MDX',
    file: 'lib/source.ts',
    lang: 'ts',
    code: `import { defineDocs } from 'fumadocs-mdx/macro';
import { loader } from 'fumadocs-core/source';

const docs = defineDocs({
  dir: 'content/docs',
});

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});`,
  },
  {
    name: '@fumadocs/content-collections',
    title: 'Content Collections',
    file: 'lib/source.ts',
    lang: 'ts',
    code: `import { allDocs, allMetas } from 'content-collections';
import { loader } from 'fumadocs-core/source';
import { createMDXSource } from '@fumadocs/content-collections';

export const source = loader({
  baseUrl: '/docs',
  source: createMDXSource(allDocs, allMetas),
});`,
  },
  {
    name: '@fumadocs/local-md',
    title: 'Local Markdown',
    file: 'lib/source.ts',
    lang: 'ts',
    code: `import { dynamicLoader } from 'fumadocs-core/source';
import { localMd } from '@fumadocs/local-md';

const docs = localMd({
  dir: 'content/docs',
  // options
});

const docsLoader = dynamicLoader(docs.dynamicSource(), {
  baseUrl: '/docs',
});

export async function getSource() {
  return docsLoader.get();
}`,
  },
  {
    name: '@fumadocs/notion',
    title: 'Notion',
    file: 'lib/source.ts',
    lang: 'ts',
    code: `import { dynamicLoader } from 'fumadocs-core/source';
import { notion } from '@/lib/notion';

const source = dynamicLoader(
  notion.dynamicSource({
    // map Notion properties to page fields
    properties: {
      title: 'Name',
      slug: 'Slug',
      description: 'Description',
    },
  }),
  {
    baseUrl: '/docs',
  },
);

export async function getSource() {
  return source.get();
}`,
  },
  {
    name: 'fumadocs-obsidian',
    title: 'Obsidian',
    file: 'lib/source.ts',
    lang: 'ts',
    code: `import { dynamicLoader } from 'fumadocs-core/source';
import { obsidian } from 'fumadocs-obsidian';

const vault = obsidian({
  dir: 'public/vault',
  // map vault attachments to their public URLs
  url: (path) => \`/vault/\${path}\`,
});

const vaultLoader = dynamicLoader(vault.dynamicSource(), {
  baseUrl: '/docs',
});

export function getSource() {
  return vaultLoader.get();
}`,
  },
  {
    name: '@fumadocs/sanity',
    title: 'Sanity',
    file: 'lib/source.ts',
    lang: 'ts',
    code: `import { dynamicLoader } from 'fumadocs-core/source';
import { createSanitySource } from '@fumadocs/sanity';
import { client } from '@/sanity/lib/client';
import type { Docs } from '@/sanity/types';

const source = dynamicLoader(
  createSanitySource<Docs>({
    client,
    docType: 'docs',
  }),
  {
    baseUrl: '/docs',
  },
);

export async function getSource() {
  return source.get();
}`,
  },
];

// from content/docs/ui/layouts/docs.mdx, headless/components/toc.mdx and the
// `customize` command of the CLI, which rewrites the layout imports of examples/next-min
const ui: Option[] = [
  {
    name: 'fumadocs-ui',
    title: 'Fumadocs UI',
    file: 'layout.tsx',
    lang: 'tsx',
    code: `import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      // other props
    >
      {children}
    </DocsLayout>
  );
}`,
  },
  {
    name: 'fumadocs-core',
    title: 'Headless',
    file: 'fumadocs-core/toc',
    lang: 'tsx',
    code: `import * as Base from 'fumadocs-core/toc';

return (
  <Base.AnchorProvider>
    <Base.ScrollProvider>
      <Base.TOCItem />
      <Base.TOCItem />
    </Base.ScrollProvider>
  </Base.AnchorProvider>
);`,
  },
  {
    name: '@/layouts/docs',
    title: 'Own copy',
    file: 'app/docs/layout.tsx',
    lang: 'tsx',
    command: 'npx @fumadocs/cli customize',
    code: `import { source } from '@/lib/source';
import { DocsLayout } from '@/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}`,
  },
];

// from examples/{next-min,react-router-min,tanstack-start-min,waku,astro}, included by
// content/docs/(framework)/manual-installation/*.mdx
const framework: Option[] = [
  {
    name: 'next',
    title: 'Next.js',
    file: 'app/docs/layout.tsx',
    lang: 'tsx',
    code: `import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}`,
  },
  {
    name: 'react-router',
    title: 'React Router',
    file: 'app/routes/docs.tsx',
    lang: 'tsx',
    code: `export async function loader({ params }: Route.LoaderArgs) {
  const slugs = params['*'].split('/').filter((v) => v.length > 0);
  const page = source.getPage(slugs);
  if (!page) throw new Response('Not found', { status: 404 });

  return {
    path: page.path,
    url: page.url,
    pageTree: await source.serializePageTree(source.getPageTree()),
  };
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const { path, pageTree } = useFumadocsLoader(loaderData);

  return (
    <DocsLayout {...baseOptions()} tree={pageTree}>
      <Content path={path} />
    </DocsLayout>
  );
}`,
  },
  {
    name: '@tanstack/react-start',
    title: 'TanStack Start',
    file: 'routes/docs/$.tsx',
    lang: 'tsx',
    code: `export const Route = createFileRoute('/docs/$')({
  component: Page,
  loader: async ({ params }) => {
    const slugs = params._splat?.split('/') ?? [];
    const data = await serverLoader({ data: slugs });
    await docs.getPage(data.path)?.preload();
    return data;
  },
});

function Page() {
  const data = useFumadocsLoader(Route.useLoaderData());

  return (
    <DocsLayout {...baseOptions()} tree={data.pageTree}>
      <Suspense>
        <Content path={data.path} />
      </Suspense>
    </DocsLayout>
  );
}`,
  },
  {
    name: 'waku',
    title: 'Waku',
    file: 'pages/docs/_layout.tsx',
    lang: 'tsx',
    code: `import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';
import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout {...baseOptions()} tree={source.getPageTree()}>
      {children}
    </DocsLayout>
  );
}`,
  },
  {
    name: 'astro',
    title: 'Astro',
    file: 'src/pages/[...slug].astro',
    lang: 'astro',
    code: `<Layout>
  <title>{page.data.title}</title>
  <meta name="title" content={page.data.title} />
  <meta name="description" content={page.data.description} />
  <meta property="og:image" content={image} />
  <Docs
    tree={source.getPageTree()}
    pathname={Astro.url.pathname}
    params={Astro.params}
    page={{ toc }}
    client:load
  >
    <h1 class="font-semibold text-3xl">{page.data.title}</h1>
    <p class="text-lg text-fd-muted-foreground mb-8">{page.data.description}</p>
    <div class="prose flex-1">
      <Content components={{ ...defaultMdxComponents }} />
    </div>
  </Docs>
</Layout>`,
  },
];

// the hub every other layer plugs into, it is never swapped
const core: Option[] = [
  {
    name: 'fumadocs-core',
    title: 'Fumadocs Core',
    file: '',
    lang: 'ts',
    code: '',
  },
];

export const slots: Slot[] = [
  { layer: 'ui', swappable: true, options: ui },
  { layer: 'core', swappable: false, options: core },
  { layer: 'content', swappable: true, options: content },
  { layer: 'framework', swappable: true, options: framework },
];
