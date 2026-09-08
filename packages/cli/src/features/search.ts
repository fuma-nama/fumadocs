import path from 'node:path';
import type { Feature, FeatureContext } from '@/features';
import type { ReactFramework } from '@/project';
import {
  addImport,
  addJsxAttribute,
  addTanstackPrerender,
  filterReactRouterPrerenderArray,
  filterReactRouterRoute,
  findJsxElement,
} from '@/codemod';
import { docs } from './docs';
import { findSource, posix, reactFramework, registerReactRouterRoutes, scripts } from './utils';

/** how client code reads public env variables */
interface Env {
  prefix: string;
  read: string;
}

const publicEnv = (next: boolean): Env =>
  next
    ? { prefix: 'NEXT_PUBLIC_', read: 'process.env.NEXT_PUBLIC_' }
    : { prefix: 'VITE_', read: 'import.meta.env.VITE_' };

const dialogImports = `import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import { useI18n } from 'fumadocs-ui/contexts/i18n';`;

const dialogBody = (footer: string, url: string) => `  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== 'empty' ? query.data : null} />
        <SearchDialogFooter>
          <a
            href="${url}"
            rel="noreferrer noopener"
            className="ms-auto text-xs text-fd-muted-foreground"
          >
            Search powered by ${footer}
          </a>
        </SearchDialogFooter>
      </SearchDialogContent>
    </SearchDialog>
  );
}
`;

/** `structuredData` is a function on async collections (React Router & TanStack Start) */
const exportIndexes = (
  imports: string,
  record: string,
  async: boolean,
) => `import { source } from '@/lib/source';
${imports}

export async function exportSearchIndexes() {
  const results: ${record.includes('_id') ? 'DocumentRecord' : 'OramaDocument'}[] = [];
  for (const page of source.getPages()) {
    results.push({
${record.replace('page.data.structuredData', async ? 'await page.data.structuredData()' : 'page.data.structuredData')}
    });
  }
  return results;
}
`;

const syncScript = (imports: string, body: string) => `import * as fs from 'node:fs/promises';
${imports}

async function main(filePath: string) {
  const content = await fs.readFile(filePath);
  const records = JSON.parse(content.toString()) as DocumentRecord[];
${body}
  console.log(\`search updated: \${records.length} records\`);
}

// the path of pre-rendered \`static.json\`
const filePath = process.argv[2];
if (!filePath) throw new Error('missing the path of static.json');
void main(filePath);
`;

interface Provider {
  label: string;
  hint: string;
  dependencies: Record<string, string | null>;
  /** keys exposed to the client, prefixed per framework */
  publicEnv: string[];
  privateEnv: string[];
  /** works without a server at runtime */
  static: boolean;
  dialog: (env: Env) => string;
  /** exports search indexes to a pre-rendered `static.json`, synced by `sync` after build */
  exportIndexes?: (async: boolean) => string;
  sync?: (env: Env, dir: string) => string;
  /** server-side search, replaces the default search route */
  searchRoute?: Record<ReactFramework, string>;
}

const providers = {
  'orama-cloud': {
    label: 'Orama Cloud',
    hint: 'signup needed',
    dependencies: { '@orama/core': null },
    publicEnv: ['ORAMA_DATASOURCE_ID', 'ORAMA_PROJECT_ID', 'ORAMA_API_KEY'],
    privateEnv: ['ORAMA_PRIVATE_API_KEY'],
    static: true,
    dialog: (env) => `'use client';
${dialogImports}
import { useDocsSearch } from 'fumadocs-core/search/client';
import { OramaCloud } from '@orama/core';

const client = new OramaCloud({
  projectId: ${env.read}ORAMA_PROJECT_ID!,
  apiKey: ${env.read}ORAMA_API_KEY!,
});

export default function CustomSearchDialog(props: SharedProps) {
  const { locale } = useI18n();
  const { search, setSearch, query } = useDocsSearch({
    type: 'orama-cloud',
    client,
    locale,
  });

${dialogBody('Orama', 'https://orama.com')}`,
    exportIndexes: (async) =>
      exportIndexes(
        "import type { OramaDocument } from 'fumadocs-core/search/orama-cloud';",
        `      id: page.url,
        structured: page.data.structuredData,
        url: page.url,
        title: page.data.title,
        description: page.data.description,`,
        async,
      ),
    sync: (env) =>
      syncScript(
        `import { type OramaDocument as DocumentRecord, sync } from 'fumadocs-core/search/orama-cloud';
import { OramaCloud } from '@orama/core';`,
        `  const orama = new OramaCloud({
    projectId: process.env.${env.prefix}ORAMA_PROJECT_ID!,
    apiKey: process.env.ORAMA_PRIVATE_API_KEY!,
  });

  await sync(orama, {
    index: process.env.${env.prefix}ORAMA_DATASOURCE_ID!,
    documents: records,
  });
`,
      ),
  },
  algolia: {
    label: 'Algolia',
    hint: 'signup needed',
    dependencies: { algoliasearch: null },
    publicEnv: ['ALGOLIA_APP_ID', 'ALGOLIA_SEARCH_KEY'],
    privateEnv: ['ALGOLIA_WRITE_KEY'],
    static: true,
    dialog: (env) => `'use client';
${dialogImports}
import { useDocsSearch } from 'fumadocs-core/search/client';
import { algoliaClient } from 'fumadocs-core/search/client/algolia';
import { liteClient } from 'algoliasearch/lite';

const algolia = liteClient(${env.read}ALGOLIA_APP_ID!, ${env.read}ALGOLIA_SEARCH_KEY!);

export default function CustomSearchDialog(props: SharedProps) {
  const { locale } = useI18n();
  const { search, setSearch, query } = useDocsSearch({
    client: algoliaClient({
      client: algolia,
      indexName: 'document',
      locale,
    }),
  });

${dialogBody('Algolia', 'https://algolia.com')}`,
    exportIndexes: (async) =>
      exportIndexes(
        "import type { DocumentRecord } from 'fumadocs-core/search/algolia';",
        `      _id: page.url,
        structured: page.data.structuredData,
        url: page.url,
        title: page.data.title,
        description: page.data.description,`,
        async,
      ),
    sync: (env) =>
      syncScript(
        `import { type DocumentRecord, sync } from 'fumadocs-core/search/algolia';
import { algoliasearch } from 'algoliasearch';`,
        `  const client = algoliasearch(
    process.env.${env.prefix}ALGOLIA_APP_ID!,
    process.env.ALGOLIA_WRITE_KEY!,
  );

  await sync(client, {
    indexName: 'document',
    documents: records,
  });
`,
      ),
  },
  typesense: {
    label: 'Typesense',
    hint: 'self-hosted or cloud, community adapter',
    dependencies: { typesense: null, 'typesense-fumadocs-adapter': null },
    publicEnv: ['TYPESENSE_URL', 'TYPESENSE_SEARCH_KEY'],
    privateEnv: ['TYPESENSE_API_KEY'],
    static: true,
    dialog: (env) => `'use client';
${dialogImports}
import { Client } from 'typesense';
import { useTypesenseSearch } from 'typesense-fumadocs-adapter/client';

const client = new Client({
  nodes: [{ url: ${env.read}TYPESENSE_URL! }],
  apiKey: ${env.read}TYPESENSE_SEARCH_KEY!,
});

export default function CustomSearchDialog(props: SharedProps) {
  const { locale } = useI18n();
  const { search, setSearch, query } = useTypesenseSearch({
    typesenseCollectionName: 'docs',
    locale,
    client,
  });

${dialogBody('Typesense', 'https://typesense.org')}`,
    exportIndexes: (async) =>
      exportIndexes(
        "import type { DocumentRecord } from 'typesense-fumadocs-adapter';",
        `      _id: page.url,
        structured: page.data.structuredData,
        url: page.url,
        title: page.data.title,
        description: page.data.description,
        locale: page.locale,`,
        async,
      ),
    sync: (env) =>
      syncScript(
        `import { type DocumentRecord, sync } from 'typesense-fumadocs-adapter';
import { Client } from 'typesense';`,
        `  const client = new Client({
    nodes: [{ url: process.env.${env.prefix}TYPESENSE_URL! }],
    apiKey: process.env.TYPESENSE_API_KEY!,
    connectionTimeoutSeconds: 60 * 15,
  });

  await sync(client, {
    typesenseCollectionName: 'docs',
    documents: records,
  });
`,
      ),
  },
  mixedbread: {
    label: 'Mixedbread',
    hint: 'AI search, signup needed',
    dependencies: { '@mixedbread/sdk': null },
    publicEnv: [],
    privateEnv: ['MIXEDBREAD_API_KEY', 'MIXEDBREAD_STORE_ID'],
    static: false,
    dialog: () => `'use client';
${dialogImports}
import { useDocsSearch } from 'fumadocs-core/search/client';
import { fetchClient } from 'fumadocs-core/search/client/fetch';

export default function CustomSearchDialog(props: SharedProps) {
  const { locale } = useI18n();
  const { search, setSearch, query } = useDocsSearch({
    client: fetchClient({
      api: '/api/search',
      locale,
    }),
  });

${dialogBody('Mixedbread', 'https://mixedbread.com')}`,
    sync: (_env, dir) => `import { spawnSync } from 'node:child_process';

// sync the content with Mixedbread CLI
const result = spawnSync(
  'npx',
  ['--yes', '@mixedbread/cli', 'vs', 'sync', process.env.MIXEDBREAD_STORE_ID!, '${dir}', '--ci'],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
`,
    searchRoute: (() => {
      const server = `import { createMixedbreadSearchAPI } from 'fumadocs-core/search/mixedbread';
import Mixedbread from '@mixedbread/sdk';

const server = createMixedbreadSearchAPI({
  client: new Mixedbread({
    apiKey: process.env.MIXEDBREAD_API_KEY,
  }),
  storeIdentifier: process.env.MIXEDBREAD_STORE_ID!,
});
`;
      return {
        next: `${server}
export const { GET } = server;
`,
        'react-router': `import type { Route } from './+types/search';
${server}
export async function loader({ request }: Route.LoaderArgs) {
  return server.GET(request);
}
`,
        'tanstack-start': `import { createFileRoute } from '@tanstack/react-router';
${server}
export const Route = createFileRoute('/api/search')({
  server: {
    handlers: {
      GET: async ({ request }) => server.GET(request),
    },
  },
});
`,
        waku: `${server}
export const { GET } = server;
`,
      };
    })(),
  },
} satisfies Record<string, Provider>;

export type SearchProvider = keyof typeof providers;

const staticRoutes: Record<ReactFramework, [file: string, content: string]> = {
  next: [
    'app/static.json/route.ts',
    `import { exportSearchIndexes } from '@/lib/export-search-indexes';

export const revalidate = false;

export async function GET() {
  return Response.json(await exportSearchIndexes());
}
`,
  ],
  'react-router': [
    'routes/static.ts',
    `import { exportSearchIndexes } from '@/lib/export-search-indexes';

export async function loader() {
  return Response.json(await exportSearchIndexes());
}
`,
  ],
  'tanstack-start': [
    'routes/static[.]json.ts',
    `import { createFileRoute } from '@tanstack/react-router';
import { exportSearchIndexes } from '@/lib/export-search-indexes';

export const Route = createFileRoute('/static.json')({
  server: {
    handlers: {
      GET: async () => Response.json(await exportSearchIndexes()),
    },
  },
});
`,
  ],
  waku: [
    'pages/_api/static.json.ts',
    `import { exportSearchIndexes } from '@/lib/export-search-indexes';

export async function GET() {
  return Response.json(await exportSearchIndexes());
}

export const getConfig = () => ({
  render: 'static',
});
`,
  ],
};

export const search: Feature<{ provider: SearchProvider }> = {
  id: 'search',
  title: 'Search',
  description: 'replace the default search with a 3rd party search solution',
  requires: [docs],
  supports: (project) => project.source.loader || '`lib/source.ts` must export a `source` loader',
  options: {
    provider: {
      message: 'Choose a search provider',
      choices: Object.entries(providers).map(([value, { label, hint }]) => ({
        value: value as SearchProvider,
        label,
        hint,
      })),
    },
  },
  async apply(ctx, { provider: name }) {
    const { project } = ctx;
    const { baseDir } = project;
    const framework = reactFramework(project);
    const provider: Provider = providers[name];
    if (project.static && !provider.static)
      throw new Error(`${provider.label} requires a server at runtime`);
    const env = publicEnv(framework === 'next');

    ctx.addDependencies(provider.dependencies);
    await ctx.write(path.join(baseDir, 'components/search.tsx'), provider.dialog(env));

    // other routes (e.g. MCP) also create a search server, only match the search route itself
    const searchRoute = await findSource(
      project.cwd,
      path.join(baseDir, project.info.routesDir),
      'createFromSource(',
      (file) => /(^|[\\/])search(\.ts|[\\/]route\.ts)$/.test(file),
    );
    if (provider.searchRoute) {
      if (searchRoute) await ctx.write(searchRoute, provider.searchRoute[framework]);
      else
        ctx.note(
          'Create the search route with `createMixedbreadSearchAPI`, see https://fumadocs.dev/docs/headless/search/mixedbread.',
        );
    } else if (searchRoute) {
      await removeDefaultSearch(ctx, searchRoute);
    }

    if (provider.exportIndexes) {
      await ctx.write(
        path.join(baseDir, 'lib/export-search-indexes.ts'),
        provider.exportIndexes(project.source.async),
      );
      const [route, content] = staticRoutes[framework];
      await ctx.write(path.join(baseDir, route), content);

      if (framework === 'react-router') {
        await registerReactRouterRoutes(ctx, [{ path: 'static.json', entry: route }]);
      } else if (framework === 'tanstack-start' && project.configFile) {
        await ctx.source(project.configFile, (file) =>
          addTanstackPrerender(file, ['/static.json']),
        );
      }
    }

    const rootProvider = await findSource(project.cwd, baseDir, '<RootProvider');
    const edited =
      rootProvider !== undefined &&
      (await ctx.source(rootProvider, (file) => {
        const element = findJsxElement(file, 'RootProvider')?.openingElement;
        if (!element || file.code.slice(element.start, element.end).includes('search=')) return;
        addJsxAttribute(file, element, 'search={{ SearchDialog }}');
        addImport(file, { from: '@/components/search', default: 'SearchDialog' });
      }));
    if (!edited)
      ctx.note(
        'Pass `search={{ SearchDialog }}` from `@/components/search` to `<RootProvider />`.',
      );

    if (provider.sync) {
      // path of the pre-rendered `static.json`, passed to the sync script
      const output = {
        next: '.next/server/app/static.json.body',
        'react-router': 'build/client/static.json',
        'tanstack-start': project.static ? 'dist/client/static.json' : '.output/public/static.json',
        waku: 'dist/public/static.json',
      }[framework];
      await ctx.write('scripts/sync-content.ts', provider.sync(env, project.source.dir));
      await ctx.packageJson((data) => {
        const build = data.scripts?.build ?? '';
        if (build.includes('sync-content')) return;
        const sync = `node --env-file-if-exists=.env.local scripts/sync-content.ts${provider.exportIndexes ? ` ${output}` : ''}`;
        scripts(data, { build: build ? `${build} && ${sync}` : sync });
      });
    }

    for (const key of provider.publicEnv) ctx.env(env.prefix + key, '');
    for (const key of provider.privateEnv) ctx.env(key, '');
    ctx.note(
      `Fill the ${provider.label} keys in \`.env.local\`, the search index is synced after each build.\nSee https://fumadocs.dev/docs/headless/search/${name}.`,
    );
  },
};

/** remove the default search route, which conflicts with the search provider */
async function removeDefaultSearch(ctx: FeatureContext, file: string) {
  const { baseDir, framework } = ctx.project;
  await ctx.remove(file);
  if (framework !== 'react-router') return;

  const entry = posix(path.relative(baseDir, file));
  await ctx.source(path.join(baseDir, 'routes.ts'), (source) => {
    filterReactRouterRoute(source, (item) => item.entry !== entry);
  });
  await ctx.source('react-router.config.ts', (source) => {
    filterReactRouterPrerenderArray(source, 'excluded', (item) => item !== '/api/search');
  });
}
