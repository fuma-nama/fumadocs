import type { Layer } from '../../ui/chip';

/** the layers top down, the page is the top of the first */
export const LAYERS: Layer[] = ['ui', 'core', 'content', 'framework'];

/** each layer's name in a sentence */
export const NAMES: Record<Layer, string> = {
  ui: 'UI',
  core: 'Core',
  content: 'Content',
  framework: 'Framework',
};

export type SwapLayer = Exclude<Layer, 'core'>;

/** every layer but the core, which the others plug into */
export const SWAPS = LAYERS.filter((layer): layer is SwapLayer => layer !== 'core');

export interface Option {
  /** its name in prose, as the docs spell it: the label of its key and the layer's nameplate */
  title: string;
  /** the module */
  name: string;
  /** the code window's title; its extension is the code's language */
  file: string;
  code: string;
  /** a command that produced the file */
  command?: string;
  /** a UI of your own: the page on the stack is plain, and the framework's provider is the core's */
  headless?: boolean;
}

interface Framework extends Option {
  /** the same file on a headless UI: the provider of `fumadocs-core` instead of Fumadocs UI's */
  core: string;
}

/** the core never swaps: every other layer plugs into it */
export const CORE = { title: 'Fumadocs Core', name: 'fumadocs-core' };

// examples/waku/src/pages/docs/_layout.tsx, with its import as `npx @fumadocs/cli customize`
// rewrites it (packages/cli/src/commands/customise.ts)
function layout(from: string) {
  return `import type { ReactNode } from 'react';
import { DocsLayout } from '${from}';
import { source } from '@/lib/source';
import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout {...baseOptions()} tree={source.getPageTree()}>
      {children}
    </DocsLayout>
  );
}`;
}

const ui: Option[] = [
  {
    title: 'Fumadocs UI',
    name: 'fumadocs-ui',
    file: 'layout.tsx',
    code: layout('fumadocs-ui/layouts/docs'),
  },
  // content/docs/headless/components/toc-example.tsx
  {
    title: 'Headless',
    name: 'fumadocs-core/toc',
    file: 'components/toc.tsx',
    headless: true,
    code: `import { AnchorProvider, ScrollProvider, TOCItem, type TOCItemType } from 'fumadocs-core/toc';
import { type ReactNode, useRef } from 'react';

export function Page({ items, children }: { items: TOCItemType[]; children: ReactNode }) {
  const viewRef = useRef<HTMLDivElement>(null);

  return (
    <AnchorProvider toc={items}>
      <div ref={viewRef} className="overflow-auto">
        <ScrollProvider containerRef={viewRef}>
          {items.map((item) => (
            <TOCItem key={item.url} href={item.url}>
              {item.title}
            </TOCItem>
          ))}
        </ScrollProvider>
      </div>
      {children}
    </AnchorProvider>
  );
}`,
  },
  {
    title: 'Your copy',
    name: '@/layouts/docs',
    file: 'layout.tsx',
    command: 'npx @fumadocs/cli customize',
    code: layout('@/layouts/docs'),
  },
];

// examples/next-min and examples/content-collections, then integrations/content/*.mdx without
// their optional options and comments
const content: Option[] = [
  {
    title: 'Fumadocs MDX',
    name: 'fumadocs-mdx',
    file: 'lib/source.ts',
    code: `import { loader } from 'fumadocs-core/source';
import { defineDocs } from 'fumadocs-mdx/macro';

const docs = defineDocs({
  dir: 'content/docs',
});

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});`,
  },
  {
    title: 'Content Collections',
    name: '@fumadocs/content-collections',
    file: 'lib/source.ts',
    code: `import { allDocs, allMetas } from 'content-collections';
import { loader } from 'fumadocs-core/source';
import { createMDXSource } from '@fumadocs/content-collections';

export const source = loader({
  baseUrl: '/docs',
  source: createMDXSource(allDocs, allMetas),
});`,
  },
  {
    title: 'Local Markdown',
    name: '@fumadocs/local-md',
    file: 'lib/source.ts',
    code: `import { dynamicLoader } from 'fumadocs-core/source';
import { localMd } from '@fumadocs/local-md';

const docs = localMd({
  dir: 'content/docs',
});

const docsLoader = dynamicLoader(docs.dynamicSource(), {
  baseUrl: '/docs',
});

export async function getSource() {
  return docsLoader.get();
}`,
  },
  {
    title: 'Notion',
    name: '@fumadocs/notion',
    file: 'lib/source.ts',
    code: `import { dynamicLoader } from 'fumadocs-core/source';
import { notion } from '@/lib/notion';

const source = dynamicLoader(notion.dynamicSource(), {
  baseUrl: '/docs',
});

export async function getSource() {
  return source.get();
}`,
  },
  {
    title: 'Obsidian',
    name: 'fumadocs-obsidian',
    file: 'lib/source.ts',
    code: `import { dynamicLoader } from 'fumadocs-core/source';
import { obsidian } from 'fumadocs-obsidian';

const vault = obsidian({
  dir: 'public/vault',
  url: (path) => \`/vault/\${path}\`,
});

if (process.env.NODE_ENV === 'development') {
  void vault.devServer();
}

const vaultLoader = dynamicLoader(vault.dynamicSource(), {
  baseUrl: '/docs',
});

export function getSource() {
  return vaultLoader.get();
}`,
  },
  {
    title: 'Sanity',
    name: '@fumadocs/sanity',
    file: 'lib/source.ts',
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

/** a root file, written with the provider it wraps the app in: Fumadocs UI's, or the core's */
function frameworkOf(
  option: Omit<Framework, 'code' | 'core'>,
  path: string,
  core: string,
  write: (provider: string, from: string) => string,
): Framework {
  return {
    ...option,
    code: write('RootProvider', `fumadocs-ui/provider/${path}`),
    core: write(core, `fumadocs-core/framework/${path}`),
  };
}

// where each framework takes the provider: examples/next-min without its font, the root.tsx of
// manual-installation/react-router.mdx, examples/tanstack-start-min without its page metadata,
// examples/waku, and the Astro island of ui/layouts/root-provider.mdx typed as in
// headless/index.mdx, whose providers stand in on a headless UI
const framework: Framework[] = [
  frameworkOf(
    { title: 'Next.js', name: 'next', file: 'app/layout.tsx' },
    'next',
    'NextProvider',
    (name, from) => `import { ${name} } from '${from}';
import './global.css';

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <${name}>{children}</${name}>
      </body>
    </html>
  );
}`,
  ),
  frameworkOf(
    { title: 'React Router', name: 'react-router', file: 'app/root.tsx' },
    'react-router',
    'ReactRouterProvider',
    (name, from) => `import { Links, Meta, Scripts, ScrollRestoration } from 'react-router';
import { ${name} } from '${from}';
import './app.css';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="flex flex-col min-h-screen">
        <${name}>{children}</${name}>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}`,
  ),
  frameworkOf(
    { title: 'TanStack Start', name: '@tanstack/react-start', file: 'src/routes/__root.tsx' },
    'tanstack',
    'TanstackProvider',
    (
      name,
      from,
    ) => `import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { ${name} } from '${from}';
import appCss from '@/styles/app.css?url';

export const Route = createRootRoute({
  head: () => ({ links: [{ rel: 'stylesheet', href: appCss }] }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex flex-col min-h-screen">
        <${name}>
          <Outlet />
        </${name}>
        <Scripts />
      </body>
    </html>
  );
}`,
  ),
  frameworkOf(
    { title: 'Waku', name: 'waku', file: 'src/components/provider.tsx' },
    'waku',
    'WakuProvider',
    (name, from) => `'use client';
import type { ReactNode } from 'react';
import { ${name} } from '${from}';

export function Provider({ children }: { children: ReactNode }) {
  return <${name}>{children}</${name}>;
}`,
  ),
  frameworkOf(
    { title: 'Astro', name: 'astro', file: 'src/components/docs.tsx' },
    'astro',
    'AstroProvider',
    (name, from) => {
      const ui = name === 'RootProvider';
      return `import type { ReactNode } from 'react';
${ui ? "import { navigate } from 'astro:transitions/client';\n" : ''}import { ${name} } from '${from}';

export function DocsIsland({
  children,
  pathname,
  params,
}: {
  children: ReactNode;
  pathname: string;
  params: Record<string, string | string[] | undefined>;
}) {
  return (
    <${name} pathname={pathname} params={params}${ui ? ' navigate={navigate}' : ''}>
      {children}
    </${name}>
  );
}`;
    },
  ),
];

export const OPTIONS = { ui, content, framework } satisfies Record<SwapLayer, Option[]>;
