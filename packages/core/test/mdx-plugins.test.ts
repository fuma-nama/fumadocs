import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { remark } from 'remark';
import {
  rehypeToc,
  remarkAdmonition,
  remarkHeading,
  remarkImage,
  remarkStructure,
} from '@/mdx-plugins';
import { fileURLToPath } from 'node:url';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import { createProcessor } from '@mdx-js/mdx';
import * as fs from 'node:fs/promises';
import { remarkSteps } from '@/mdx-plugins/remark-steps';

const cwd = path.dirname(fileURLToPath(import.meta.url));

test('Remark Heading', async () => {
  const file = path.resolve(cwd, './fixtures/remark-heading.md');
  const content = readFileSync(file);

  const result = await remark().use(remarkHeading).process(content);

  await expect(result.data.toc).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-heading.output.json'),
  );
});

test('Remark Structure', async () => {
  const content = readFileSync(
    path.resolve(cwd, './fixtures/remark-structure.md'),
  );
  const result = await remark()
    .use(remarkGfm)
    .use(remarkStructure)
    .process(content);

  await expect(result.data.structuredData).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-structure.output.json'),
  );
});

test('Remark Admonition', async () => {
  const content = readFileSync(
    path.resolve(cwd, './fixtures/remark-admonition.md'),
  );
  const result = await remark()
    .use(remarkAdmonition)
    .use(remarkMdx)
    .process(content);

  await expect(result.value).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-admonition.output.mdx'),
  );
});

test('Remark Steps', async () => {
  const content = await fs.readFile(
    path.resolve(cwd, './fixtures/remark-steps.md'),
  );
  const processor = remark().use(remarkSteps).use(remarkMdx);
  const result = await processor.process(content);

  await expect(result.value).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-steps.output.md'),
  );
});

test('Remark Image: With Path', async () => {
  const file = path.resolve(cwd, './fixtures/remark-image.md');
  const content = readFileSync(file);
  const processor = remark()
    .use(remarkImage, { publicDir: path.resolve(cwd, './fixtures') })
    .use(remarkMdx);

  const result = await processor.run(processor.parse(content), {
    path: file,
  });

  await expect(result).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-image.output.json'),
  );
});

test('Remark Image: Without Import', async () => {
  const content = readFileSync(path.resolve(cwd, './fixtures/remark-image.md'));
  const result = await remark()
    .use(remarkImage, {
      publicDir: path.resolve(cwd, './fixtures'),
      useImport: false,
    })
    .use(remarkMdx)
    .process(content);

  await expect(result.value).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-image-without-import.output.mdx'),
  );
});

test('Remark Image: `publicDir` with URL', async () => {
  const content = readFileSync(
    path.resolve(cwd, './fixtures/remark-image-public-dir.md'),
  );
  const result = await remark()
    .use(remarkImage, {
      publicDir: 'https://picsum.photos/id',
      useImport: false,
    })
    .use(remarkMdx)
    .process(content);

  await expect(result.value).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/remark-image-public-dir.output.mdx'),
  );
});

test('Rehype Toc', async () => {
  const content = readFileSync(path.resolve(cwd, './fixtures/rehype-toc.md'));

  const processor = createProcessor({
    remarkPlugins: [remarkHeading],
    rehypePlugins: [rehypeToc],
  });
  const result = await processor.process({ value: content });

  await expect(result.value).toMatchFileSnapshot(
    path.resolve(cwd, './fixtures/rehype-toc.output.js'),
  );
});
