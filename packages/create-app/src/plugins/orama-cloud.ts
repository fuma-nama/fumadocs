import { TemplatePlugin } from '@/index';
import { copy, pick, writeFile } from '@/utils';
import path from 'node:path';
import { depVersions, sourceDir } from '@/constants';
import fs from 'node:fs/promises';
import {
  reactRouterRoutes,
  rootProvider,
  tanstackStartRoutes,
} from '@/transform';

export function oramaCloud(): TemplatePlugin {
  return {
    packageJson(packageJson) {
      return {
        ...packageJson,
        scripts: {
          ...packageJson.scripts,
          build: `${packageJson.scripts!.build} && bun scripts/sync-content.ts`,
        },
        dependencies: {
          ...packageJson.dependencies,
          ...pick(depVersions, ['@orama/core']),
        },
      };
    },
    readme(content) {
      return `${content}\n\n## Orama Cloud
    
This project uses Orama Cloud for 3rd party search solution.

See https://fumadocs.dev/docs/headless/search/orama-cloud for integrating Orama Cloud to Fumadocs.`;
    },
    async afterWrite() {
      const { dest, appDir, template } = this;
      await copy(path.join(sourceDir, 'template/+orama-cloud/@root'), dest);
      await copy(path.join(sourceDir, 'template/+orama-cloud/@app'), appDir);

      await rootProvider(this, (mod) =>
        mod.addSearchDialog('@/components/search'),
      );

      if (template.value === 'tanstack-start') {
        await tanstackStartRoutes(this, (mod) => {
          mod.addRoute({
            path: 'static[.]json.ts',
            route: '/static.json',
            code: route.tanstack,
            prerender: true,
          });
          mod.removeRoute({
            path: 'api/search.ts',
            route: '/api/search',
          });
        });
      } else if (template.value.startsWith('react-router')) {
        await reactRouterRoutes(this, (mod) => {
          mod.addRoute(
            'static.json',
            'routes/static.ts',
            route['react-router'],
          );
          mod.removeRoute('api/search');
        });
      } else if (template.value.startsWith('+next')) {
        await Promise.all([
          fs
            .unlink(path.join(appDir, 'app/api/search/route.ts'))
            .catch(() => null),
          writeFile(path.join(appDir, 'app/static.json/route.ts'), route.next),
        ]);
      } else {
        await Promise.all([
          fs.unlink(path.join(appDir, 'pages/api/search.ts')).catch(() => null),
          writeFile(path.join(appDir, 'pages/static.json.ts'), route.waku),
        ]);
      }

      const filePath = {
        '+next+fuma-docs-mdx': '.next/server/app/static.json.body',
        'tanstack-start': '.output/public/static.json',
        'tanstack-start-spa': 'dist/client/static.json',
        'react-router': 'build/client/static.json',
        'react-router-spa': 'build/client/static.json',
        waku: 'dist/public/static.json',
      }[template.value];

      await writeFile(
        path.join(dest, 'scripts/sync-content.ts'),
        `import { type OramaDocument, sync } from 'fumadocs-core/search/orama-cloud';
import * as fs from 'node:fs/promises';
import { OramaCloud } from '@orama/core';

// the path of pre-rendered \`static.json\`
const filePath = '${filePath}';

async function main() {
  const orama = new OramaCloud({
    projectId: process.env.NEXT_PUBLIC_ORAMA_PROJECT_ID,
    apiKey: process.env.ORAMA_PRIVATE_API_KEY,
  });

  const content = await fs.readFile(filePath);
  const records = JSON.parse(content.toString()) as OramaDocument[];

  await sync(orama, {
    index: process.env.NEXT_PUBLIC_ORAMA_DATASOURCE_ID,
    documents: records,
  });

  console.log(\`search updated: \${records.length} records\`);
}

void main();`,
      );
    },
  };
}

const route = {
  next: `import { exportSearchIndexes } from '@/lib/export-search-indexes';

export const revalidate = false;

export async function GET() {
  return Response.json(await exportSearchIndexes());
}`,
  'react-router': `import { exportSearchIndexes } from '@/lib/export-search-indexes';

export async function loader() {
  return Response.json(await exportSearchIndexes());
}`,
  tanstack: `import { createFileRoute } from '@tanstack/react-router';
import { exportSearchIndexes } from '@/lib/export-search-indexes';

export const Route = createFileRoute('/static.json')({
  server: {
    handlers: {
      GET: async () => Response.json(await exportSearchIndexes()),
    },
  },
});`,
  waku: `import { exportSearchIndexes } from '@/lib/export-search-indexes';

export async function GET() {
  return Response.json(await exportSearchIndexes());
}

export const getConfig = () => ({
  render: 'static',
});`,
};
