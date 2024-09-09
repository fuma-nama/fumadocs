import fs from 'node:fs/promises';
import { StructureKind } from 'ts-morph';
import { type Plugin } from '@/commands/init';
import { resolveAppPath } from '@/utils/is-src';
import { createEmptyProject } from '@/utils/typescript';
import { generated } from '@/generated';
import { getPackageManager } from '@/utils/get-package-manager';
import { transformTailwind } from '@/utils/transform-tailwind';

export const openapiPlugin: Plugin = {
  files: () => ({
    'scripts/generate-docs.mjs': generated['scripts/generate-docs'],
  }),
  dependencies: ['fumadocs-openapi', 'rimraf'],
  async transform(src) {
    await Promise.all([
      transformSource(src),
      transformTailwind({
        addContents: [`./node_modules/fumadocs-openapi/dist/**/*.js`],
      }),
      addScript(),
    ]);
  },
  instructions: async () => [
    {
      type: 'text',
      text: `Made a script to generate docs from OpenAPI Schema.
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
      text: 'Run the script with:',
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

async function transformSource(src: boolean): Promise<void> {
  const source = resolveAppPath('./lib/source.ts', src);
  const project = createEmptyProject();

  const file = project.createSourceFile(
    source,
    await fs.readFile(source).then((res) => res.toString()),
    {
      overwrite: true,
    },
  );

  file.addImportDeclaration({
    kind: StructureKind.ImportDeclaration,
    namedImports: ['createOpenAPI'],
    moduleSpecifier: 'fumadocs-openapi/server',
  });

  file.addStatements(`export const openapi = createOpenAPI();`);
  await file.save();
}
