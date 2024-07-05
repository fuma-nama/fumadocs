import { expect, test } from 'vitest';
import { remarkDocGen } from '@/remark-docgen';
import { createProcessor } from '@mdx-js/mdx';
import { fileGenerator } from '@/file-generator';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { remarkInstall } from '@/remark-install';
import { remark } from 'remark';
import { typescriptGenerator } from '@/typescript-generator';

const cwd = path.dirname(fileURLToPath(import.meta.url));

test('File Generator', async () => {
  const content = readFileSync(path.resolve(cwd, './fixtures/file-gen.md'));

  const processor = remark().use(remarkDocGen, {
    generators: [fileGenerator()],
  });

  const result = await processor.process({ cwd, value: content });

  expect(result.toString()).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/file-gen.output.md'),
  );
});

test('File Generator - Relative', async () => {
  const file = path.resolve(cwd, './fixtures/file-gen.relative.md');
  const content = readFileSync(file);

  const result = await remark()
    .use(remarkDocGen, {
      generators: [fileGenerator({ relative: true })],
    })
    .process({ path: file, value: content, cwd });

  expect(result.toString()).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/file-gen.relative.output.md'),
  );
});

test('Remark Install', async () => {
  const file = path.resolve(cwd, './fixtures/remark-install.md');
  const content = readFileSync(file);

  const result = await createProcessor({
    remarkPlugins: [remarkInstall],
  }).process(content);

  expect(result.toString()).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-install.output.js'),
  );
});

test('Remark Install', async () => {
  const file = path.resolve(cwd, './fixtures/remark-install-persist.md');
  const content = readFileSync(file);

  const result = await createProcessor({
    remarkPlugins: [
      [
        remarkInstall,
        {
          persist: {
            id: 'package_install',
          },
        },
      ],
    ],
  }).process(content);

  expect(result.toString()).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-install-persist.output.js'),
  );
});

test('Typescript Generator', async () => {
  const file = path.resolve(cwd, './fixtures/typescript-gen.md');
  const content = readFileSync(file);

  const tsconfig = {
    tsconfigPath: path.resolve(cwd, '../tsconfig.json'),
    basePath: path.resolve(cwd, '../'),
  };

  const result = await createProcessor({
    remarkPlugins: [
      [
        remarkDocGen,
        { generators: [typescriptGenerator({ config: tsconfig })] },
      ],
    ],
  }).process({ value: content, cwd });

  expect(result.toString()).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/typescript-gen.output.js'),
  );
});
