import { expect, test } from 'vitest';
import { remark } from 'remark';
import remarkMdx from 'remark-mdx';
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';
import { remarkPostprocess } from '@/loaders/mdx/remark-postprocess';

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
  visit(tree, (node) => {
    positions.push(node.position);
  });

  expect(positions.length).toBeGreaterThan(tree.children.length);
  expect(positions.every((position) => position === undefined)).toBe(true);
});
