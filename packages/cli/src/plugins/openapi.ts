import fs from 'node:fs/promises';
import path from 'node:path';
import { type Project, StructureKind } from 'ts-morph';
import { type Plugin } from '@/commands/init';
import { createEmptyProject } from '@/utils/typescript';
import { generated } from '@/generated';
import { getPackageManager } from '@/utils/get-package-manager';
import { transformTailwind } from '@/utils/transform-tailwind';
import { type Config, defaultConfig } from '@/config';

export const openapiPlugin: Plugin = {
  files: () => ({
    'scripts/generate-docs.mjs': generated['scripts/generate-docs'],
  }),
  dependencies: ['fumadocs-openapi', 'rimraf', 'shiki'],
  async transform(ctx) {
    const project = createEmptyProject();

    await Promise.all([
      transformSource(project, ctx),
      transformTailwind(project, {
        addContents: [`./node_modules/fumadocs-openapi/dist/**/*.js`],
      }),
      addScript(),
    ]);
  },
  instructions: async () => [
    {
      type: 'text',
      text: `I've made some changes to your Tailwind CSS config.
You can add the APIPage component to your page.tsx:`,
    },
    {
      type: 'code',
      title: 'page.tsx',
      code: `import defaultMdxComponents from 'fumadocs-ui/mdx';
import { openapi } from '@/lib/source';
 
<MDX
  components={{
    ...defaultMdxComponents,
    APIPage: openapi.APIPage,
  }}
/>;`,
    },
    {
      type: 'text',
      text: `Paste your OpenAPI schema to ./openapi.json, and use this script to generate docs:`,
    },
    {
      type: 'code',
      title: 'Terminal',
      code: `${await getPackageManager()} run build:docs`,
    },
  ],
};

async function addScript(): Promise<void> {
  const content = await fs.readFile('package.json');
  const parsed = JSON.parse(content.toString()) as Record<string, unknown>;

  if (typeof parsed.scripts !== 'object') return;

  parsed.scripts ??= {};
  Object.assign(parsed.scripts ?? {}, {
    'build:docs': 'node ./scripts/generate-docs.mjs',
  });

  await fs.writeFile('package.json', JSON.stringify(parsed, null, 2));
}

async function transformSource(
  project: Project,
  config: Config,
): Promise<void> {
  const source = path.join(
    config.aliases?.libDir ?? defaultConfig.aliases.libDir,
    'source.ts',
  );
  const content = await fs.readFile(source).catch(() => '');
  const file = project.createSourceFile(source, content.toString(), {
    overwrite: true,
  });

  file.addImportDeclaration({
    kind: StructureKind.ImportDeclaration,
    namedImports: ['createOpenAPI'],
    moduleSpecifier: 'fumadocs-openapi/server',
  });

  file.addStatements(`export const openapi = createOpenAPI();`);
  await file.save();
}
