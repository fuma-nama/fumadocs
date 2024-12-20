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
import { remarkTypeScriptToJavaScript } from '@/remark-ts2js';

const cwd = path.dirname(fileURLToPath(import.meta.url));

test('File Generator', async () => {
  const content = readFileSync(path.resolve(cwd, './fixtures/file-gen.md'));

  const processor = remark().use(remarkDocGen, {
    generators: [fileGenerator()],
  });

  const result = await processor.process({ cwd, value: content });

  await expect(result.toString()).toMatchFileSnapshot(
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

  await expect(result.toString()).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/file-gen.relative.output.md'),
  );
});

test('Remark Install', async () => {
  const file = path.resolve(cwd, './fixtures/remark-install.md');
  const content = readFileSync(file);

  const result = await createProcessor({
    remarkPlugins: [remarkInstall],
    jsx: true,
  }).process(content);

  await expect(result.toString()).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-install.output.jsx'),
  );
});

test('Remark Install', async () => {
  const file = path.resolve(cwd, './fixtures/remark-install-persist.md');
  const content = readFileSync(file);

  const result = await createProcessor({
    jsx: true,
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

  await expect(result.toString()).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-install-persist.output.jsx'),
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
    jsx: true,
  }).process({ value: content, cwd });

  await expect(result.toString()).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/typescript-gen.output.jsx'),
  );
});

test('TS to JS', async () => {
  const file = path.resolve(cwd, './fixtures/ts2js.md');
  const content = readFileSync(file);

  const result = await createProcessor({
    remarkPlugins: [remarkTypeScriptToJavaScript],
    jsx: true,
  }).process(content);

  await expect(result.toString()).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/ts2js.output.jsx'),
  );
});
