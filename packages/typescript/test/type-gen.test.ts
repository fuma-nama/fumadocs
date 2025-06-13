import {
  createGenerator,
  type GeneratorOptions,
  remarkAutoTypeTable,
  type RemarkAutoTypeTableOptions,
} from '../src';
import { fileURLToPath } from 'url';
import { expect, test } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { createProcessor } from '@mdx-js/mdx';

const relative = (s: string): string =>
  path.resolve(fileURLToPath(new URL(s, import.meta.url)));

const tsconfig: GeneratorOptions = {
  tsconfigPath: relative('../tsconfig.json'),
  basePath: relative('../'),
  cache: false,
};

const generator = createGenerator(tsconfig);

test('Run', async () => {
  const file = relative('./fixtures/test.ts');

  const result = ['Test1', 'Test2', 'Test3'].flatMap((name) =>
    generator.generateDocumentation({ path: file }, name),
  );

  await expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(
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
    value: (await fs.readFile(file)).toString(),
  });
  await expect(String(output.value)).toMatchFileSnapshot(
    './fixtures/test.output.js',
  );
});
