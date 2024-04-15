import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { remark } from 'remark';
import { remarkHeading, remarkStructure } from '@/mdx-plugins';
import { fileURLToPath } from 'node:url';

const cwd = path.dirname(fileURLToPath(import.meta.url));

test('Remark Heading', async () => {
  const file = path.resolve(cwd, './fixtures/remark-heading.md');
  const content = readFileSync(file);

  const result = await remark().use(remarkHeading).process(content);

  expect(JSON.stringify(result.data.toc)).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-heading.output.json'),
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
