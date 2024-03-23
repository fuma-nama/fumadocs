import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { remark } from 'remark';
import {
  remarkDynamicContent,
  remarkHeading,
  remarkInstall,
  remarkStructure,
} from '@/mdx-plugins';
import { fileURLToPath } from 'node:url';
import { createProcessor } from '@mdx-js/mdx';

const cwd = path.dirname(fileURLToPath(import.meta.url));

test('Remark Dynamic Content', async () => {
  const content = readFileSync(
    path.resolve(cwd, './fixtures/remark-dynamic-content.md'),
  );

  const result = await remark()
    .use(remarkDynamicContent)
    .process({ value: content, cwd });

  expect(result.toString()).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-dynamic-content.output.md'),
  );
});

test('Remark Dynamic Content - Relative', async () => {
  const file = path.resolve(
    cwd,
    './fixtures/remark-dynamic-content.relative.md',
  );
  const content = readFileSync(file);

  const result = await remark()
    .use(remarkDynamicContent, { relative: true })
    .process({ path: file, value: content });

  expect(result.toString()).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-dynamic-content.relative.output.md'),
  );
});

test('Remark Heading', async () => {
  const file = path.resolve(cwd, './fixtures/remark-heading.md');
  const content = readFileSync(file);

  const result = await remark().use(remarkHeading).process(content);

  expect(JSON.stringify(result.data.toc)).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-heading.output.json'),
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

test('Remark Structure', async () => {
  const content = readFileSync(
    path.resolve(cwd, './fixtures/remark-structure.md'),
  );
  const result = await remark().use(remarkStructure).process(content);

  expect(JSON.stringify(result.data.structuredData)).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-structure.output.json'),
  );
});
