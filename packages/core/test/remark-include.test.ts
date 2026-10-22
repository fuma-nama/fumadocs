import { expect, test } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { remark } from 'remark';
import remarkMdx from 'remark-mdx';
import remarkDirective from 'remark-directive';
import { VFile } from 'vfile';
import { remarkInclude, type RemarkIncludeOptions } from '@/mdx-plugins/remark-include';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/remark-include');

async function include(value: string, options?: RemarkIncludeOptions, data: VFile['data'] = {}) {
  const file = new VFile({ path: path.join(dir, 'page.mdx'), value, data });
  return String(
    await remark().use(remarkMdx).use(remarkDirective).use(remarkInclude, options).process(file),
  );
}

test('includes content, sections & code regions', async () => {
  const value = await fs.readFile(path.join(dir, 'index.mdx'), 'utf-8');

  await expect(await include(value)).toMatchFileSnapshot('fixtures/remark-include/index.out.mdx');
});

test('extracts a section by its heading ID', async () => {
  const out = await include('<include>./sections.md#usage-1</include>');

  expect(out).toContain('second-usage-marker');
  expect(out).not.toContain('first-usage-marker');
  expect(out).not.toContain('end-marker');
});

test('parses included files with the processor of their format', async () => {
  const value = '<include>./comment.md</include>';
  await expect(include(value)).rejects.toThrow();

  const md = remark();
  expect(
    await include(value, {
      getProcessor: (format) => (format === 'md' ? md : remark().use(remarkMdx)),
    }),
  ).toContain('<!-- an HTML comment, invalid in MDX -->');
});

test('adds included files as dependencies of the compiler', async () => {
  const dependencies: string[] = [];
  await include('<include>./test.mdx</include>\n\n<include>./code.ts#a</include>', undefined, {
    _compiler: { addDependency: (file) => dependencies.push(file) },
  });

  expect(dependencies.sort()).toEqual([path.join(dir, 'code.ts'), path.join(dir, 'test.mdx')]);
});

test('rejects circular includes', async () => {
  await expect(include('<include>./cycle-a.mdx</include>')).rejects.toThrow(/Circular include/);
});
