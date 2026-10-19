import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { expect, test } from 'vitest';
import { createGraphQL, type GraphQLPageData, type GraphQLSourceOptions } from '@/server';
import { buildSchemaFromSDL } from '@/utils/build-schema';
import { toMarkdown } from '@/utils/to-markdown';

const cwd = fileURLToPath(new URL('./', import.meta.url));
const server = createGraphQL({
  input: { store: path.join(cwd, './fixtures/store.graphql') },
  examples: [path.join(cwd, './fixtures/examples.graphql')],
});

async function getText(filePath: string, options?: GraphQLSourceOptions) {
  const source = await server.staticSource(options);
  const file = source.files.find((item) => item.path === filePath)!;
  return (file.data as GraphQLPageData).getText('processed');
}

test('operation page', async () => {
  await expect(await getText('queries/customer.mdx')).toMatchFileSnapshot(
    './out/markdown/operation.md',
  );
});

test('type page', async () => {
  await expect(await getText('objects/Customer.mdx', { includeTypes: true })).toMatchFileSnapshot(
    './out/markdown/type.md',
  );
});

test('page of a whole schema', async () => {
  await expect(await getText('store.mdx', { per: 'file' })).toMatchFileSnapshot(
    './out/markdown/file.md',
  );
});

test('types of a whole schema page', async () => {
  const text = await getText('store.mdx', {
    per: 'file',
    includeTypes: (type) => type.name === 'OrderStatus',
  });

  // the SDL carries the description of types
  expect(text).toContain(
    '## OrderStatus\n\n```graphql\n"The status of an order."\nenum OrderStatus {',
  );
});

test('code blocks outlast fences in descriptions', () => {
  const schema = buildSchemaFromSDL(`
"""
Call it like:
\`\`\`js
item()
\`\`\`
"""
type Item {
  id: ID
}

type Query {
  item: Item
  ok: Boolean
}`);
  const text = toMarkdown(
    {
      items: [
        { type: 'operation', kind: 'query', name: 'item' },
        { type: 'operation', kind: 'query', name: 'ok' },
      ],
    },
    schema,
  );

  expect(text).toContain(
    '## Types\n\n````graphql\n"""\nCall it like:\n```js\nitem()\n```\n"""\ntype Item {',
  );
  // built-in scalars describe GraphQL itself
  expect(text).toContain('## Returns\n\n`Boolean`\n\n');
});

test('arguments with defaults and deprecations', () => {
  const schema = buildSchemaFromSDL(`
type Query {
  items(
    "Page size."
    first: Int = 10
    "The cursor"
    after: String @deprecated(reason: "Use \`cursor\` instead.")
    cursor: String
  ): [String!]!
}`);
  const text = toMarkdown({ items: [{ type: 'operation', kind: 'query', name: 'items' }] }, schema);

  expect(text).toContain(`## Arguments

- \`first\` (\`Int\`, default \`10\`): Page size.
- \`after\` (\`String\`): The cursor. Deprecated: Use \`cursor\` instead.
- \`cursor\` (\`String\`)`);
});
