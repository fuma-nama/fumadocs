import { TemplatePlugin } from '@/create-app';
import { copy, pick } from '@/utils';
import path from 'node:path';
import { depVersions, sourceDir } from '@/constants';
import fs from 'node:fs/promises';
import { createSourceFile } from '@/transform/shared';
import { addTanstackPrerender } from '@/transform/tanstack-start';
import { addReactRouterRoute } from '@/transform/react-router';
import { addSearchDialog } from '@/transform/provider';

const oramaCloud: TemplatePlugin = {
  packageJson(packageJson) {
    return {
      ...packageJson,
      scripts: {
        ...packageJson.scripts,
        build: `${packageJson.scripts.build} && bun scripts/sync-content.ts`,
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
    const { dest, template, options } = this;
    const appDir = path.join(dest, options.useSrcDir ? 'src' : '.');
    await copy(path.join(sourceDir, 'template/+orama-cloud/@root'), dest);
    await copy(path.join(sourceDir, 'template/+orama-cloud/@app'), appDir);
    let providerFilePath: string;

    if (template.value === 'tanstack-start') {
      await fluent(
        createSourceFile(path.join(dest, 'vite.config.ts')),
        (file) => addTanstackPrerender(file, ['/static.json']),
        (file) => file.save(),
      );

      providerFilePath = path.join(dest, 'src/routes/__root.tsx');
    } else if (template.value.startsWith('react-router')) {
      await fluent(
        createSourceFile(path.join(dest, 'app/routes.ts')),
        (file) =>
          addReactRouterRoute(file, [
            {
              path: 'static.json',
              entry: 'routes/static.ts',
            },
          ]),
        (file) => file.save(),
      );

      providerFilePath = path.join(dest, 'app/root.tsx');
    } else if (template.value.startsWith('+next')) {
      providerFilePath = path.join(appDir, 'app/layout.tsx');
    } else {
      providerFilePath = path.join(dest, 'src/components/provider.tsx');
    }

    await fluent(
      createSourceFile(providerFilePath),
      (file) => addSearchDialog(file),
      (file) => file.save(),
    );

    const filePath = {
      '+next+fuma-docs-mdx': '.next/server/app/static.json.body',
      'tanstack-start': '.output/public/static.json',
      'react-router': 'build/client/static.json',
      'react-router-spa': 'build/client/static.json',
      waku: 'dist/public/static.json',
    }[template.value];

    const SyncContentScript = `import { type OramaDocument, sync } from 'fumadocs-core/search/orama-cloud';
import * as fs from 'node:fs/promises';
import { OramaCloud } from '@orama/core';

// the path of pre-rendered \`static.json\`
const filePath = ${JSON.stringify(filePath)};

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

void main();
`;
    await fs.mkdir(path.join(dest, 'scripts'), { recursive: true });
    await fs.writeFile(
      path.join(dest, 'scripts/sync-content.ts'),
      SyncContentScript,
    );

    await copy(
      path.join(sourceDir, `template/+orama-cloud/${template.value}`),
      appDir,
    );
  },
};

async function fluent<T>(
  value: T | Promise<T>,
  ...actions: ((value: T) => void | Promise<void>)[]
): Promise<T> {
  for (const action of actions) {
    await action(await value);
  }

  return value;
}

export default oramaCloud;
