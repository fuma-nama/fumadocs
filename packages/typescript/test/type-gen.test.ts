import { generateDocumentation, generateMDX } from '../src';
import { fileURLToPath } from 'url';
import { expect, test } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';

const relative = (s: string): string =>
  path.resolve(fileURLToPath(new URL(s, import.meta.url)));

const tsconfig = {
  tsconfigPath: relative('../tsconfig.json'),
  basePath: relative('../'),
};

test('Run', () => {
  const file = relative('./fixtures/test.ts');

  const result = ['Test1', 'Test2', 'Test3'].map((name) =>
    generateDocumentation({
      file,
      name,
      options: tsconfig,
    }),
  );

  expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(
    './fixtures/test.output.json',
  );
});

test('Run on MDX files', () => {
  const file = relative('./fixtures/test.mdx');
  const content = fs.readFileSync(file).toString();

  expect(
    generateMDX(content, { basePath: path.dirname(file), options: tsconfig }),
  ).toMatchFileSnapshot('./fixtures/test.output.mdx');
});
