import { expect, test } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { remark } from 'remark';
import remarkMdx from 'remark-mdx';
import remarkDirective from 'remark-directive';
import type { Nodes, Root } from 'mdast';
import { remarkPostprocess } from '@/loaders/mdx/remark-postprocess';
import { walk } from '@/loaders/mdx/mdast-utils';
import { defineCollections } from '@/config';
import { buildConfig } from '@/config/build';
import { createCore } from '@/core';
import { buildMDX } from '@/loaders/mdx/build';

const source = '# Title\n\nsome text\n';

// the plugin unshifts each export as an mdxjsEsm node carrying an estree
function readExport(tree: Root, name: string): unknown {
  for (const node of tree.children) {
    if (node.type !== 'mdxjsEsm') continue;

    const declaration = node.data?.estree?.body[0];
    if (declaration?.type !== 'ExportNamedDeclaration') continue;
    if (declaration.declaration?.type !== 'VariableDeclaration') continue;

    const [declarator] = declaration.declaration.declarations;
    if (declarator?.id.type !== 'Identifier' || declarator.id.name !== name) continue;
    return declarator.init;
  }
}

async function run(includeMDAST: boolean | { removePosition?: boolean }): Promise<Root> {
  const processor = remark()
    .use(remarkMdx)
    .use(remarkPostprocess, { _format: 'mdx', includeMDAST });
  return processor.run(processor.parse(source));
}

test('includeMDAST exports the tree', async () => {
  const init = readExport(await run(true), '_mdast');

  expect(init).toMatchObject({ type: 'Literal' });
  expect(JSON.parse((init as { value: string }).value).type).toBe('root');
});

test('includeMDAST with removePosition exports the tree', async () => {
  const init = readExport(await run({ removePosition: true }), '_mdast');

  expect(init).toMatchObject({ type: 'Literal' });

  const tree = JSON.parse((init as { value: string }).value) as Root;
  expect(tree.type).toBe('root');

  const positions: unknown[] = [];
  walk<Nodes>(tree, (node) => {
    positions.push(node.position);
  });

  expect(positions.length).toBeGreaterThan(tree.children.length);
  expect(positions.every((position) => position === undefined)).toBe(true);
});

test('includeProcessedMarkdown keeps the authored source', async () => {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/remark-include');
  const core = createCore({
    configPath: 'source.config.ts',
    environment: 'test',
    outDir: '.source',
  });
  const config = buildConfig(
    {
      docs: defineCollections({
        type: 'doc',
        dir,
        postprocess: { includeProcessedMarkdown: true },
      }),
      default: { mdxOptions: { rehypeCodeOptions: false, remarkPlugins: [remarkDirective] } },
    },
    process.cwd(),
  );
  await core.init({ config });

  const collection = config.collections.get('docs');
  if (collection?.type !== 'doc') throw new Error('missing collection');
  const { code } = await buildMDX(core, collection, {
    filePath: path.join(dir, 'page.mdx'),
    source: [
      "import { Callout } from './callout';",
      '',
      '# Title',
      '',
      '![Diagram](/images/diagram.png)',
      '',
      '- Steps:',
      '',
      '  <include>./code.ts#a</include>',
      '',
      '> <include>./test.mdx#section-in-jsx</include>',
    ].join('\n'),
    environment: 'bundler',
    isDevelopment: false,
  });

  expect(JSON.parse(/^export let _markdown = (.+);$/m.exec(code)![1])).toMatchInlineSnapshot(`
    "# Title [#title]

    ![Diagram](/images/diagram.png)

    - Steps:

      \`\`\`ts
      console.log('hello world');
      \`\`\`

    > This is My Test.
    >
    > ### Nested Heading [#nested-heading]
    >
    > \`\`\`ts
    > console.log('Hello World');
    > \`\`\`
    "
  `);
});
