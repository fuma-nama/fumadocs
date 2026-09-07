import path from 'node:path';
import type { Feature, FeatureContext } from '@/features';
import type { ReactFramework } from '@/project';
import {
  addImport,
  addJsxAttribute,
  addReactRouterRoute,
  addTanstackPrerender,
  filterReactRouterPrerenderArray,
  filterReactRouterRoute,
  findJsxElement,
} from '@/codemod';
import { docs } from './docs';
import { findSource, reactFramework, scripts } from './utils';

/** how client code reads public env variables */
const publicEnv = (next: boolean) =>
  next
    ? { prefix: 'NEXT_PUBLIC_', read: 'process.env.NEXT_PUBLIC_' }
    : { prefix: 'VITE_', read: 'import.meta.env.VITE_' };

const searchDialog = (env: ReturnType<typeof publicEnv>) => `'use client';
import {
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
import { useDocsSearch } from 'fumadocs-core/search/client';
import { OramaCloud } from '@orama/core';
import { useI18n } from 'fumadocs-ui/contexts/i18n';

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
        <SearchDialogFooter>
          <a
            href="https://orama.com"
            rel="noreferrer noopener"
            className="ms-auto text-xs text-fd-muted-foreground"
          >
            Search powered by Orama
          </a>
        </SearchDialogFooter>
      </SearchDialogContent>
    </SearchDialog>
  );
}
`;

const exportIndexes = `import { source } from '@/lib/source';
import type { OramaDocument } from 'fumadocs-core/search/orama-cloud';

export async function exportSearchIndexes() {
  return source.getPages().map((page) => {
    return {
      id: page.url,
      structured: page.data.structuredData,
      url: page.url,
      title: page.data.title,
      description: page.data.description,
    } satisfies OramaDocument;
  });
}
`;

const routes: Record<ReactFramework, [file: string, content: string]> = {
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

const syncScript = (
  file: string,
  env: ReturnType<typeof publicEnv>,
) => `import { type OramaDocument, sync } from 'fumadocs-core/search/orama-cloud';
import * as fs from 'node:fs/promises';
import { OramaCloud } from '@orama/core';

// the path of pre-rendered \`static.json\`
const filePath = '${file}';

async function main() {
  const orama = new OramaCloud({
    projectId: process.env.${env.prefix}ORAMA_PROJECT_ID!,
    apiKey: process.env.ORAMA_PRIVATE_API_KEY!,
  });

  const content = await fs.readFile(filePath);
  const records = JSON.parse(content.toString()) as OramaDocument[];

  await sync(orama, {
    index: process.env.${env.prefix}ORAMA_DATASOURCE_ID!,
    documents: records,
  });

  console.log(\`search updated: \${records.length} records\`);
}

void main();
`;

export const oramaCloud: Feature = {
  id: 'orama-cloud',
  title: 'Orama Cloud',
  description: 'search powered by Orama Cloud, replaces the default search',
  requires: [docs],
  async apply(ctx) {
    const { project } = ctx;
    const { baseDir } = project;
    const framework = reactFramework(project);

    const env = publicEnv(framework === 'next');

    ctx.addDependencies({ '@orama/core': null });
    await ctx.write(path.join(baseDir, 'components/search.tsx'), searchDialog(env));
    await ctx.write(path.join(baseDir, 'lib/export-search-indexes.ts'), exportIndexes);

    const [route, content] = routes[framework];
    await ctx.write(path.join(baseDir, route), content);
    await removeDefaultSearch(ctx);

    if (framework === 'react-router') {
      await ctx.source(path.join(baseDir, 'routes.ts'), (file) => {
        if (file.code.includes(route)) return;
        addReactRouterRoute(file, [{ path: 'static.json', entry: route }]);
      });
    } else if (framework === 'tanstack-start' && project.configFile) {
      await ctx.source(project.configFile, (file) => addTanstackPrerender(file, ['/static.json']));
    }

    const provider = await findSource(project.cwd, baseDir, '<RootProvider');
    const edited =
      provider !== undefined &&
      (await ctx.source(provider, (file) => {
        const element = findJsxElement(file, 'RootProvider')?.openingElement;
        if (!element || file.code.slice(element.start, element.end).includes('search=')) return;
        addJsxAttribute(file, element, 'search={{ SearchDialog }}');
        addImport(file, { from: '@/components/search', default: 'SearchDialog' });
      }));
    if (!edited)
      ctx.note(
        'Pass `search={{ SearchDialog }}` from `@/components/search` to `<RootProvider />`.',
      );

    const output = {
      next: '.next/server/app/static.json.body',
      'react-router': 'build/client/static.json',
      'tanstack-start': project.static ? 'dist/client/static.json' : '.output/public/static.json',
      waku: 'dist/public/static.json',
    }[framework];
    await ctx.write('scripts/sync-content.ts', syncScript(output, env));
    await ctx.packageJson((data) => {
      const build = data.scripts?.build ?? '';
      if (!build.includes('sync-content')) {
        const sync = 'node --env-file-if-exists=.env.local scripts/sync-content.ts';
        scripts(data, { build: build ? `${build} && ${sync}` : sync });
      }
    });

    for (const key of ['ORAMA_DATASOURCE_ID', 'ORAMA_PROJECT_ID', 'ORAMA_API_KEY'])
      ctx.env(env.prefix + key, '');
    ctx.env('ORAMA_PRIVATE_API_KEY', '');
    ctx.note(
      'Fill the Orama Cloud keys in `.env.local`, the search index is synced after each build.\nSee https://fumadocs.dev/docs/headless/search/orama-cloud.',
    );
  },
};

/** remove the search route of the default search, which conflicts with Orama Cloud */
async function removeDefaultSearch(ctx: FeatureContext) {
  const { cwd, baseDir, info, framework } = ctx.project;
  const file = await findSource(cwd, path.join(baseDir, info.routesDir), 'createFromSource(');
  if (!file) return;
  await ctx.remove(file);

  if (framework !== 'react-router') return;
  const entry = path.relative(baseDir, file);
  await ctx.source(path.join(baseDir, 'routes.ts'), (source) => {
    filterReactRouterRoute(source, (item) => item.entry !== entry);
  });
  await ctx.source('react-router.config.ts', (source) => {
    filterReactRouterPrerenderArray(source, 'excluded', (item) => item !== '/api/search');
  });
}
