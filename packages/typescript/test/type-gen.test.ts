import { createGenerator, remarkAutoTypeTable, type RemarkAutoTypeTableOptions } from '../src';
import { fileURLToPath } from 'url';
import { expect, test } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { createProcessor } from '@mdx-js/mdx';
import { remarkHeading } from 'fumadocs-core/mdx-plugins/remark-heading';
import { remarkStructure } from 'fumadocs-core/mdx-plugins/remark-structure';
import { remarkLLMs } from 'fumadocs-core/mdx-plugins/remark-llms';

const relative = (s: string): string => path.resolve(fileURLToPath(new URL(s, import.meta.url)));

const generator = createGenerator({
  tsconfigPath: relative('../tsconfig.json'),
  cache: false,
});

test('Run', async () => {
  const file = relative('./fixtures/test.ts');

  const result = await Promise.all(
    ['Test1', 'Test2', 'Test3', 'Test4'].map((name) => {
      return generator.generateDocumentation({ path: file }, name);
    }),
  );

  await expect(JSON.stringify(result.flat(), null, 2)).toMatchFileSnapshot(
    './fixtures/test.output.json',
  );
});

test('Run on MDX files', async () => {
  const file = relative('./fixtures/test.mdx');
  const processor = createProcessor({
    remarkPlugins: [
      [
        remarkAutoTypeTable,
        {
          generator,
        } as RemarkAutoTypeTableOptions,
      ],
    ],
  });

  const output = await processor.process({
    path: file,
    value: await fs.readFile(file, 'utf-8'),
  });
  await expect(String(output.value)).toMatchFileSnapshot('./fixtures/test.output.js');
});

test('Search records of props', async () => {
  const file = relative('./fixtures/test.mdx');
  const processor = createProcessor({
    remarkPlugins: [[remarkAutoTypeTable, { generator }], remarkHeading, remarkStructure],
  });

  const output = await processor.process({
    path: file,
    value: await fs.readFile(file, 'utf-8'),
  });
  expect(output.data.structuredData).toMatchInlineSnapshot(`
    {
      "contents": [
        {
          "content": "| \`name\` | \`string\` | The name of player Default: \`Henry\` |
    | --- | --- | --- |",
          "heading": "type-table-test-2.ts-Player-name",
          "table": "type-table-test-2.ts-Player",
        },
        {
          "content": "| \`age\` | \`timestamp\` |  |
    | --- | --- | --- |",
          "heading": "type-table-test-2.ts-Player-age",
          "table": "type-table-test-2.ts-Player",
        },
      ],
      "headings": [],
    }
  `);
});

test('Markdown of type tables', async () => {
  const file = relative('./fixtures/test.mdx');
  const processor = createProcessor({
    remarkPlugins: [
      [remarkAutoTypeTable, { generator }],
      [remarkLLMs, { _data: true }],
    ],
  });

  const output = await processor.process({
    path: file,
    value: await fs.readFile(file, 'utf-8'),
  });
  expect(output.data.markdown).toMatchInlineSnapshot(`
    "### Player

    Player in the room

    | Prop | Type | Description |
    | --- | --- | --- |
    | \`name\` | \`string\` | The name of player Default: \`Henry\` |
    | \`age\` | \`timestamp\` |  |
    "
  `);
});
